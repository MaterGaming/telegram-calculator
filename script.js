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
        this.radiansMode = true;
        this.theme = 'dark';
        this.soundEnabled = false;
        this.voiceInputSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        
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
        this.createToastContainer();
        this.loadSettings();
    }

    loadSettings() {
        // Загружаем настройки из localStorage
        const settings = JSON.parse(localStorage.getItem('calculatorSettings') || '{}');
        this.soundEnabled = settings.soundEnabled || false;
        this.radiansMode = settings.radiansMode !== undefined ? settings.radiansMode : true;
        this.theme = settings.theme || 'dark';
    }

    saveSettings() {
        localStorage.setItem('calculatorSettings', JSON.stringify({
            soundEnabled: this.soundEnabled,
            radiansMode: this.radiansMode,
            theme: this.theme
        }));
    }

    createToastContainer() {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    showToast(message, type = 'info', duration = 2000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const container = document.querySelector('.toast-container');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    playSound(type = 'click') {
        if (!this.soundEnabled) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'click':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
            case 'error':
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
            case 'success':
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
        }
        
        oscillator.start();
    }

    // Голосовой ввод
    startVoiceInput() {
        if (!this.voiceInputSupported) {
            this.showToast('Голосовой ввод не поддерживается в этом браузере', 'error');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'ru-RU';
        recognition.continuous = false;
        recognition.interimResults = false;

        this.showToast('Говорите...', 'info');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            this.processVoiceCommand(transcript);
        };

        recognition.onerror = (event) => {
            this.showToast('Ошибка распознавания', 'error');
        };

        recognition.start();
    }

    processVoiceCommand(command) {
        // Преобразуем голосовые команды в математические выражения
        let processed = command
            .replace('плюс', '+')
            .replace('минус', '-')
            .replace('умножить на', '*')
            .replace('разделить на', '/')
            .replace('в степени', '^')
            .replace('корень из', 'sqrt(')
            .replace('синус', 'sin(')
            .replace('косинус', 'cos(')
            .replace('тангенс', 'tan(')
            .replace('пи', Math.PI.toString())
            .replace('е', Math.E.toString())
            .replace('процент', '%')
            .replace('равно', '')
            .replace('=', '')
            .replace(' ', '');

        this.expression = processed;
        this.updateDisplay();
        this.calculate();
        this.showToast(`Распознано: ${command}`, 'success');
        this.playSound('success');
    }

    // Конвертер валют
    async convertCurrency() {
        const fromCurrency = prompt('Введите код валюты (например: USD, EUR, RUB):', 'USD');
        const toCurrency = prompt('Введите целевую валюту:', 'RUB');
        const amount = parseFloat(prompt('Введите сумму:', '100'));

        if (!fromCurrency || !toCurrency || isNaN(amount)) {
            this.showToast('Неверные данные', 'error');
            return;
        }

        try {
            // Используем бесплатный API (замените на свой ключ)
            const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`);
            const data = await response.json();
            
            if (data.rates && data.rates[toCurrency.toUpperCase()]) {
                const rate = data.rates[toCurrency.toUpperCase()];
                const result = amount * rate;
                
                this.expression = result.toString();
                this.currentInput = result.toString();
                this.lastResult = result;
                this.updateDisplay();
                
                this.showToast(`${amount} ${fromCurrency} = ${result.toFixed(2)} ${toCurrency}`, 'success');
                this.addToHistory(`${amount} ${fromCurrency} → ${toCurrency}`, result.toFixed(2));
                this.playSound('success');
            } else {
                this.showToast('Неверный код валюты', 'error');
            }
        } catch (error) {
            this.showToast('Ошибка получения курса валют', 'error');
            this.playSound('error');
        }
    }

    // Конвертер единиц измерения
    showUnitConverter() {
        const units = {
            length: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mile'],
            weight: ['mg', 'g', 'kg', 'ton', 'lb', 'oz'],
            temperature: ['C', 'F', 'K'],
            area: ['mm²', 'cm²', 'm²', 'km²', 'ha', 'acre'],
            volume: ['ml', 'l', 'm³', 'gal', 'qt', 'pt', 'cup']
        };

        const category = prompt('Выберите категорию (length, weight, temperature, area, volume):', 'length');
        
        if (!units[category]) {
            this.showToast('Неверная категория', 'error');
            return;
        }

        const fromUnit = prompt(`Из какой единицы (${units[category].join(', ')}):`, units[category][0]);
        const toUnit = prompt(`В какую единицу (${units[category].join(', ')}):`, units[category][1]);
        const value = parseFloat(prompt('Введите значение:', '1'));

        if (isNaN(value)) {
            this.showToast('Неверное значение', 'error');
            return;
        }

        const result = this.convertUnits(category, value, fromUnit, toUnit);
        
        if (result !== null) {
            this.expression = result.toString();
            this.currentInput = result.toString();
            this.lastResult = result;
            this.updateDisplay();
            
            this.showToast(`${value} ${fromUnit} = ${result.toFixed(4)} ${toUnit}`, 'success');
            this.addToHistory(`${value} ${fromUnit} → ${toUnit}`, result.toFixed(4));
            this.playSound('success');
        } else {
            this.showToast('Ошибка конвертации', 'error');
        }
    }

    convertUnits(category, value, fromUnit, toUnit) {
        const conversions = {
            length: {
                'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000,
                'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mile': 1609.344
            },
            weight: {
                'mg': 0.000001, 'g': 0.001, 'kg': 1, 'ton': 1000,
                'lb': 0.453592, 'oz': 0.0283495
            },
            area: {
                'mm²': 0.000001, 'cm²': 0.0001, 'm²': 1, 'km²': 1000000,
                'ha': 10000, 'acre': 4046.86
            },
            volume: {
                'ml': 0.001, 'l': 1, 'm³': 1000,
                'gal': 3.78541, 'qt': 0.946353, 'pt': 0.473176, 'cup': 0.236588
            }
        };

        if (category === 'temperature') {
            // Специальная обработка для температуры
            return this.convertTemperature(value, fromUnit, toUnit);
        }

        if (!conversions[category] || !conversions[category][fromUnit] || !conversions[category][toUnit]) {
            return null;
        }

        // Конвертируем в базовую единицу (метр, кг, м², л), затем в целевую
        const baseValue = value * conversions[category][fromUnit];
        return baseValue / conversions[category][toUnit];
    }

    convertTemperature(value, fromUnit, toUnit) {
        // Конвертируем в Цельсий, затем в целевую единицу
        let celsius;
        
        switch(fromUnit) {
            case 'C': celsius = value; break;
            case 'F': celsius = (value - 32) * 5/9; break;
            case 'K': celsius = value - 273.15; break;
            default: return null;
        }

        switch(toUnit) {
            case 'C': return celsius;
            case 'F': return celsius * 9/5 + 32;
            case 'K': return celsius + 273.15;
            default: return null;
        }
    }

    // Графики функций
    showGraph() {
        const func = prompt('Введите функцию (например: sin(x), x^2, 2*x+1):', 'sin(x)');
        
        if (!func) return;

        // Создаем модальное окно с графиком
        const modal = document.createElement('div');
        modal.className = 'graph-modal';
        modal.innerHTML = `
            <div class="graph-content">
                <div class="graph-header">
                    <h3>График функции: ${func}</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <canvas id="functionGraph" width="400" height="300"></canvas>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            this.drawFunctionGraph(func);
        }, 100);
    }

    drawFunctionGraph(func) {
        const canvas = document.getElementById('functionGraph');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Очищаем канвас
        ctx.clearRect(0, 0, width, height);
        
        // Рисуем оси
        ctx.beginPath();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        
        // Ось X
        ctx.moveTo(0, height/2);
        ctx.lineTo(width, height/2);
        
        // Ось Y
        ctx.moveTo(width/2, 0);
        ctx.lineTo(width/2, height);
        ctx.stroke();

        // Рисуем график
        ctx.beginPath();
        ctx.strokeStyle = '#ff9f0a';
        ctx.lineWidth = 2;
        
        const xMin = -5;
        const xMax = 5;
        const yMin = -5;
        const yMax = 5;
        
        for (let px = 0; px < width; px++) {
            const x = xMin + (px / width) * (xMax - xMin);
            
            try {
                // Безопасно вычисляем функцию
                const y = eval(func.replace(/x/g, `(${x})`));
                
                if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
                    const py = height - ((y - yMin) / (yMax - yMin)) * height;
                    
                    if (px === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        ctx.lineTo(px, py);
                    }
                } else {
                    ctx.stroke();
                    ctx.beginPath();
                }
            } catch (e) {
                ctx.stroke();
                ctx.beginPath();
            }
        }
        
        ctx.stroke();
    }

    // Калькулятор процентов
    showPercentageCalculator() {
        const type = prompt('Выберите тип расчета:\n1. Процент от числа\n2. Число от процента\n3. Изменение в процентах', '1');
        
        switch(type) {
            case '1':
                const percent = parseFloat(prompt('Введите процент:', '20'));
                const number = parseFloat(prompt('Введите число:', '100'));
                if (!isNaN(percent) && !isNaN(number)) {
                    const result = (percent / 100) * number;
                    this.showToast(`${percent}% от ${number} = ${result}`, 'success');
                    this.expression = result.toString();
                    this.updateDisplay();
                }
                break;
                
            case '2':
                const part = parseFloat(prompt('Введите часть:', '20'));
                const percent2 = parseFloat(prompt('Введите процент:', '20'));
                if (!isNaN(part) && !isNaN(percent2)) {
                    const result = (part * 100) / percent2;
                    this.showToast(`${part} составляет ${percent2}% от ${result}`, 'success');
                    this.expression = result.toString();
                    this.updateDisplay();
                }
                break;
                
            case '3':
                const oldValue = parseFloat(prompt('Введите старое значение:', '100'));
                const newValue = parseFloat(prompt('Введите новое значение:', '120'));
                if (!isNaN(oldValue) && !isNaN(newValue)) {
                    const change = ((newValue - oldValue) / oldValue) * 100;
                    const sign = change > 0 ? '+' : '';
                    this.showToast(`Изменение: ${sign}${change.toFixed(2)}%`, 'success');
                    this.expression = change.toString();
                    this.updateDisplay();
                }
                break;
                
            default:
                this.showToast('Неверный выбор', 'error');
        }
    }

    // Генератор случайных чисел
    generateRandomNumber() {
        const min = parseFloat(prompt('Минимальное значение:', '1'));
        const max = parseFloat(prompt('Максимальное значение:', '100'));
        
        if (!isNaN(min) && !isNaN(max)) {
            const random = Math.random() * (max - min) + min;
            const rounded = Math.round(random * 100) / 100;
            
            this.expression = rounded.toString();
            this.currentInput = rounded.toString();
            this.lastResult = rounded;
            this.updateDisplay();
            
            this.showToast(`Случайное число: ${rounded}`, 'success');
            this.playSound('success');
        }
    }

    // Факториал
    calculateFactorial() {
        if (this.expression !== '') {
            try {
                const n = parseInt(this.evaluateExpression(this.expression));
                
                if (n < 0) {
                    this.showToast('Факториал отрицательного числа не определен', 'error');
                    return;
                }
                
                if (n > 170) {
                    this.showToast('Слишком большое число', 'error');
                    return;
                }
                
                let factorial = 1;
                for (let i = 2; i <= n; i++) {
                    factorial *= i;
                }
                
                this.expression = factorial.toString();
                this.currentInput = factorial.toString();
                this.lastResult = factorial;
                this.updateDisplay();
                
                this.addToHistory(`${n}!`, factorial);
                this.playSound('success');
            } catch (error) {
                this.showToast('Ошибка вычисления', 'error');
            }
        }
    }

    // НОД и НОК
    calculateGCD() {
        const a = parseInt(prompt('Введите первое число:', '12'));
        const b = parseInt(prompt('Введите второе число:', '18'));
        
        if (!isNaN(a) && !isNaN(b)) {
            const gcd = this.gcd(Math.abs(a), Math.abs(b));
            this.showToast(`НОД(${a}, ${b}) = ${gcd}`, 'success');
            this.expression = gcd.toString();
            this.updateDisplay();
        }
    }

    calculateLCM() {
        const a = parseInt(prompt('Введите первое число:', '12'));
        const b = parseInt(prompt('Введите второе число:', '18'));
        
        if (!isNaN(a) && !isNaN(b)) {
            const lcm = Math.abs(a * b) / this.gcd(Math.abs(a), Math.abs(b));
            this.showToast(`НОК(${a}, ${b}) = ${lcm}`, 'success');
            this.expression = lcm.toString();
            this.updateDisplay();
        }
    }

    gcd(a, b) {
        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    // Тригонометрические функции
    calculateSin() { this.calculateTrigFunction('sin'); }
    calculateCos() { this.calculateTrigFunction('cos'); }
    calculateTan() { this.calculateTrigFunction('tan'); }
    calculateAsin() { this.calculateTrigFunction('asin'); }
    calculateAcos() { this.calculateTrigFunction('acos'); }
    calculateAtan() { this.calculateTrigFunction('atan'); }

    calculateTrigFunction(func) {
        if (this.expression !== '') {
            try {
                let value = this.evaluateExpression(this.expression);
                
                // Конвертируем градусы в радианы если нужно
                if (!this.radiansMode && !func.startsWith('a')) {
                    value = value * Math.PI / 180;
                }
                
                let result;
                switch(func) {
                    case 'sin': result = Math.sin(value); break;
                    case 'cos': result = Math.cos(value); break;
                    case 'tan': result = Math.tan(value); break;
                    case 'asin': result = Math.asin(value); break;
                    case 'acos': result = Math.acos(value); break;
                    case 'atan': result = Math.atan(value); break;
                }
                
                // Конвертируем обратно в градусы для обратных функций
                if (!this.radiansMode && func.startsWith('a')) {
                    result = result * 180 / Math.PI;
                }
                
                this.expression = result.toString();
                this.currentInput = result.toString();
                this.lastResult = result;
                this.updateDisplay();
                
                this.addToHistory(`${func}(${value})`, result);
                this.playSound('success');
            } catch (error) {
                this.showToast('Ошибка вычисления', 'error');
            }
        }
    }

    // Настройки
    showSettings() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h3>Настройки</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="settings-body">
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="soundToggle" ${this.soundEnabled ? 'checked' : ''}>
                            Звуковые эффекты
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="radiansToggle" ${this.radiansMode ? 'checked' : ''}>
                            Радианы (вкл) / Градусы (выкл)
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>Тема:</label>
                        <select id="themeSelect">
                            <option value="dark" ${this.theme === 'dark' ? 'selected' : ''}>Темная</option>
                            <option value="light" ${this.theme === 'light' ? 'selected' : ''}>Светлая</option>
                            <option value="system" ${this.theme === 'system' ? 'selected' : ''}>Системная</option>
                        </select>
                    </div>
                    <button onclick="calculator.saveSettingsFromModal()" class="settings-save-btn">
                        Сохранить настройки
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    saveSettingsFromModal() {
        this.soundEnabled = document.getElementById('soundToggle').checked;
        this.radiansMode = document.getElementById('radiansToggle').checked;
        this.theme = document.getElementById('themeSelect').value;
        
        this.saveSettings();
        this.applyTheme();
        this.showToast('Настройки сохранены', 'success');
        document.querySelector('.settings-modal').remove();
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
function startVoiceInput() { calculator.startVoiceInput(); }
function convertCurrency() { calculator.convertCurrency(); }
function showUnitConverter() { calculator.showUnitConverter(); }
function showGraph() { calculator.showGraph(); }
function showPercentageCalculator() { calculator.showPercentageCalculator(); }
function generateRandomNumber() { calculator.generateRandomNumber(); }
function calculateFactorial() { calculator.calculateFactorial(); }
function calculateGCD() { calculator.calculateGCD(); }
function calculateLCM() { calculator.calculateLCM(); }
function calculateSin() { calculator.calculateSin(); }
function calculateCos() { calculator.calculateCos(); }
function calculateTan() { calculator.calculateTan(); }
function calculateAsin() { calculator.calculateAsin(); }
function calculateAcos() { calculator.calculateAcos(); }
function calculateAtan() { calculator.calculateAtan(); }
function showSettings() { calculator.showSettings(); }
