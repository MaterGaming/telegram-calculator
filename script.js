// Класс калькулятора
class Calculator {
    constructor() {
        this.display = document.getElementById('result');
        this.expressionDisplay = document.getElementById('expression');
        this.memoryIndicator = document.getElementById('memoryIndicator');
        this.currentInput = '';
        this.expression = '';
        this.memory = 0;
        this.history = this.loadHistory();
        this.lastResult = null;
        this.radiansMode = true; // true для радиан, false для градусов
        
        this.init();
    }

    init() {
        this.tg = window.Telegram.WebApp;
        this.tg.expand();
        this.applyTheme();
        this.setupEventListeners();
        this.updateDisplay();
        this.renderHistory();
        this.updateMemoryIndicator();
    }

    applyTheme() {
        document.body.style.backgroundColor = this.tg.themeParams.bg_color || '#1a1a1a';
    }

    setupEventListeners() {
        // Клавиатурные сокращения
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    handleKeyPress(e) {
        const key = e.key;
        
        if (/[0-9.]/.test(key)) {
            this.appendNumber(key);
        } else if (key === '+' || key === '-' || key === '*' || key === '/') {
            this.appendOperator(key);
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            this.calculate();
        } else if (key === 'Escape') {
            this.clearAll();
        } else if (key === 'Backspace') {
            this.deleteLast();
        } else if (key === '(' || key === ')') {
            this.appendBracket(key);
        }
    }

    // Основные операции
    appendNumber(number) {
        if (number === '.' && this.currentInput.includes('.')) {
            return; // Предотвращаем множественные десятичные точки
        }
        
        if (this.currentInput === '0' && number !== '.') {
            this.currentInput = number;
        } else {
            this.currentInput += number;
        }
        this.expression += number;
        this.updateDisplay();
    }

    appendOperator(operator) {
        const lastChar = this.expression[this.expression.length - 1];
        const operators = ['+', '-', '*', '/', '^'];
        
        if (this.expression === '' && this.lastResult !== null) {
            this.expression = this.lastResult.toString();
        }
        
        if (this.expression !== '') {
            // Заменяем последний оператор, если он есть
            if (operators.includes(lastChar)) {
                this.expression = this.expression.slice(0, -1) + operator;
            } else {
                this.expression += operator;
            }
            this.currentInput = '';
        }
        this.updateDisplay();
    }

    appendFunction(func) {
        if (func === '^') {
            this.expression += '^';
        } else {
            this.expression += func;
        }
        this.currentInput = '';
        this.updateDisplay();
    }

    appendConstant(constant) {
        if (constant === 'pi') {
            this.expression += Math.PI.toString();
            this.currentInput = Math.PI.toString();
        } else if (constant === 'e') {
            this.expression += Math.E.toString();
            this.currentInput = Math.E.toString();
        }
        this.updateDisplay();
    }

    appendBracket(bracket) {
        this.expression += bracket;
        this.updateDisplay();
    }

    clearAll() {
        this.currentInput = '';
        this.expression = '';
        this.lastResult = null;
        this.updateDisplay();
    }

    deleteLast() {
        this.expression = this.expression.slice(0, -1);
        this.currentInput = '';
        this.updateDisplay();
    }

    // Научные функции
    calculatePercentage() {
        if (this.expression !== '') {
            try {
                const result = this.evaluateExpression(this.expression) / 100;
                this.addToHistory(this.expression + '%', result);
                this.expression = result.toString();
                this.currentInput = result.toString();
                this.lastResult = result;
                this.updateDisplay();
            } catch (error) {
                this.showError('Ошибка вычисления');
            }
        }
    }

    calculateSquare() {
        if (this.expression !== '') {
            try {
                const value = this.evaluateExpression(this.expression);
                const result = value * value;
                this.addToHistory(`sqr(${this.expression})`, result);
                this.expression = result.toString();
                this.currentInput = result.toString();
                this.lastResult = result;
                this.updateDisplay();
            } catch (error) {
                this.showError('Ошибка вычисления');
            }
        }
    }

    calculateReciprocal() {
        if (this.expression !== '') {
            try {
                const value = this.evaluateExpression(this.expression);
                if (value === 0) {
                    this.showError('Деление на ноль');
                    return;
                }
                const result = 1 / value;
                this.addToHistory(`1/(${this.expression})`, result);
                this.expression = result.toString();
                this.currentInput = result.toString();
                this.lastResult = result;
                this.updateDisplay();
            } catch (error) {
                this.showError('Ошибка вычисления');
            }
        }
    }

    // Основное вычисление
    calculate() {
        if (this.expression === '') return;

        try {
            // Подготавливаем выражение для вычисления
            let expr = this.expression
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/−/g, '-')
                .replace(/\^/g, '**')
                .replace(/sin\(/g, 'Math.sin(')
                .replace(/cos\(/g, 'Math.cos(')
                .replace(/tan\(/g, 'Math.tan(')
                .replace(/log\(/g, 'Math.log10(')
                .replace(/ln\(/g, 'Math.log(')
                .replace(/sqrt\(/g, 'Math.sqrt(');

            // Конвертируем градусы в радианы если нужно
            if (!this.radiansMode) {
                expr = expr.replace(/Math\.(sin|cos|tan)\(/g, (match, func) => {
                    return `Math.${func}((Math.PI/180)*`;
                });
            }

            const result = eval(expr);
            
            // Округляем до 10 знаков
            const roundedResult = Math.round(result * 10000000000) / 10000000000;
            
            this.addToHistory(this.expression, roundedResult);
            this.expression = roundedResult.toString();
            this.currentInput = roundedResult.toString();
            this.lastResult = roundedResult;
            this.updateDisplay();
            
            // Отправляем результат в Telegram
            this.tg.sendData(roundedResult.toString());
            
        } catch (error) {
            this.showError('Ошибка в выражении');
        }
    }

    evaluateExpression(expr) {
        // Безопасное вычисление простого выражения
        return Function('"use strict";return (' + expr + ')')();
    }

    // Управление памятью
    memoryClear() {
        this.memory = 0;
        this.updateMemoryIndicator();
    }

    memoryRecall() {
        this.expression = this.memory.toString();
        this.currentInput = this.memory.toString();
        this.updateDisplay();
    }

    memoryAdd() {
        if (this.expression !== '') {
            try {
                const value = this.evaluateExpression(this.expression);
                this.memory += value;
                this.updateMemoryIndicator();
            } catch (error) {
                this.showError('Ошибка');
            }
        }
    }

    memorySubtract() {
        if (this.expression !== '') {
            try {
                const value = this.evaluateExpression(this.expression);
                this.memory -= value;
                this.updateMemoryIndicator();
            } catch (error) {
                this.showError('Ошибка');
            }
        }
    }

    memoryStore() {
        if (this.expression !== '') {
            try {
                const value = this.evaluateExpression(this.expression);
                this.memory = value;
                this.updateMemoryIndicator();
            } catch (error) {
                this.showError('Ошибка');
            }
        }
    }

    updateMemoryIndicator() {
        if (this.memory !== 0) {
            this.memoryIndicator.textContent = `M=${this.memory}`;
        } else {
            this.memoryIndicator.textContent = '';
        }
    }

    // История
    loadHistory() {
        const saved = localStorage.getItem('calculatorHistory');
        return saved ? JSON.parse(saved) : [];
    }

    saveHistory() {
        localStorage.setItem('calculatorHistory', JSON.stringify(this.history));
    }

    addToHistory(expression, result) {
        this.history.unshift({
            expression: expression,
            result: result,
            timestamp: new Date().toLocaleTimeString()
        });
        
        // Ограничиваем историю 20 записями
        if (this.history.length > 20) {
            this.history.pop();
        }
        
        this.saveHistory();
        this.renderHistory();
    }

    clearHistory() {
        this.history = [];
        this.saveHistory();
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        this.history.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.onclick = () => this.loadFromHistory(index);
            
            historyItem.innerHTML = `
                <div class="history-expression">${item.expression}</div>
                <div class="history-result">= ${item.result}</div>
                <small>${item.timestamp}</small>
            `;
            
            historyList.appendChild(historyItem);
        });
    }

    loadFromHistory(index) {
        const item = this.history[index];
        this.expression = item.result.toString();
        this.currentInput = item.result.toString();
        this.lastResult = item.result;
        this.updateDisplay();
    }

    // Вспомогательные функции
    updateDisplay() {
        this.display.value = this.currentInput || '0';
        this.expressionDisplay.textContent = this.expression || '';
    }

    showError(message) {
        this.display.value = message;
        setTimeout(() => {
            this.updateDisplay();
        }, 1000);
    }

    toggleAngleMode() {
        this.radiansMode = !this.radiansMode;
        this.tg.showPopup({
            title: 'Режим углов',
            message: this.radiansMode ? 'Режим: Радианы' : 'Режим: Градусы',
            buttons: [{type: 'ok'}]
        });
    }
}

// Инициализация калькулятора
const calculator = new Calculator();

// Глобальные функции для HTML
function appendNumber(num) { calculator.appendNumber(num); }
function appendOperator(op) { calculator.appendOperator(op); }
function appendFunction(func) { calculator.appendFunction(func); }
function appendConstant(constant) { calculator.appendConstant(constant); }
function appendBracket(bracket) { calculator.appendBracket(bracket); }
function clearAll() { calculator.clearAll(); }
function deleteLast() { calculator.deleteLast(); }
function calculate() { calculator.calculate(); }
function calculatePercentage() { calculator.calculatePercentage(); }
function calculateSquare() { calculator.calculateSquare(); }
function calculateReciprocal() { calculator.calculateReciprocal(); }
function memoryClear() { calculator.memoryClear(); }
function memoryRecall() { calculator.memoryRecall(); }
function memoryAdd() { calculator.memoryAdd(); }
function memorySubtract() { calculator.memorySubtract(); }
function memoryStore() { calculator.memoryStore(); }
function clearHistory() { calculator.clearHistory(); }
function toggleAngleMode() { calculator.toggleAngleMode(); }
