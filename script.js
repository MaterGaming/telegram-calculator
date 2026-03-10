let display = document.getElementById('result');
let currentInput = '';
let lastResult = null;

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Расширяем приложение на весь экран
tg.expand();

// Устанавливаем тему в соответствии с темой Telegram
document.body.style.backgroundColor = tg.themeParams.bg_color || '#f5f5f5';

// Функция для добавления числа
function appendNumber(number) {
    if (currentInput === '0' && number !== '.') {
        currentInput = number;
    } else {
        currentInput += number;
    }
    updateDisplay();
}

// Функция для добавления оператора
function appendOperator(operator) {
    if (currentInput === '' && lastResult !== null) {
        currentInput = lastResult + operator;
    } else if (currentInput !== '' && !isLastCharOperator()) {
        currentInput += operator;
    }
    updateDisplay();
}

// Проверка, является ли последний символ оператором
function isLastCharOperator() {
    const operators = ['+', '-', '*', '/', '%'];
    const lastChar = currentInput[currentInput.length - 1];
    return operators.includes(lastChar);
}

// Очистка дисплея
function clearDisplay() {
    currentInput = '';
    lastResult = null;
    updateDisplay();
}

// Удаление последнего символа
function deleteLast() {
    currentInput = currentInput.slice(0, -1);
    updateDisplay();
}

// Вычисление процента
function calculatePercentage() {
    if (currentInput !== '') {
        try {
            let result = eval(currentInput) / 100;
            currentInput = result.toString();
            updateDisplay();
        } catch (error) {
            currentInput = 'Ошибка';
            updateDisplay();
            setTimeout(() => {
                currentInput = '';
                updateDisplay();
            }, 1000);
        }
    }
}

// Вычисление результата
function calculate() {
    if (currentInput !== '') {
        try {
            // Заменяем символы для корректного вычисления
            let expression = currentInput
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/−/g, '-');
            
            let result = eval(expression);
            
            // Округляем до 10 знаков после запятой
            result = Math.round(result * 10000000000) / 10000000000;
            
            lastResult = result;
            currentInput = result.toString();
            updateDisplay();
            
            // Отправляем результат обратно в Telegram (опционально)
            tg.sendData(result.toString());
            
        } catch (error) {
            currentInput = 'Ошибка';
            updateDisplay();
            setTimeout(() => {
                currentInput = '';
                updateDisplay();
            }, 1000);
        }
    }
}

// Обновление дисплея
function updateDisplay() {
    if (currentInput === '') {
        display.value = '0';
    } else {
        display.value = currentInput;
    }
}

// Обработка клавиатуры (для ПК)
document.addEventListener('keydown', (event) => {
    const key = event.key;
    
    if (/[0-9.]/.test(key)) {
        appendNumber(key);
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        appendOperator(key);
    } else if (key === 'Enter' || key === '=') {
        calculate();
    } else if (key === 'Escape') {
        clearDisplay();
    } else if (key === 'Backspace') {
        deleteLast();
    }
});

// Показываем главную кнопку Telegram (опционально)
tg.MainButton.setText('Закрыть');
tg.MainButton.onClick(() => {
    tg.close();
});

// Инициализация
updateDisplay();