// 游戏配置
const CONFIG = {
    CANVAS_SIZE: 400,
    GRID_SIZE: 20,
    INITIAL_SPEED: 150,
    COLORS: {
        SNAKE_HEAD: '#6366f1',
        SNAKE_BODY: '#a5b4fc',
        SNAKE_BODY_GRADIENT: '#818cf8',
        FOOD: '#dc2626',
        FOOD_GLOW: '#f59e0b',
        BACKGROUND: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        GRID: '#475569',
        SPIRITUAL_ENERGY: '#6366f1'
    },
    // 修仙境界配置
    REALMS: [
        { name: '练气初期', minScore: 0, maxScore: 40 },
        { name: '练气中期', minScore: 50, maxScore: 90 },
        { name: '练气后期', minScore: 100, maxScore: 140 },
        { name: '筑基初期', minScore: 150, maxScore: 190 },
        { name: '筑基中期', minScore: 200, maxScore: 240 },
        { name: '筑基后期', minScore: 250, maxScore: 999 }
    ]
};

// 游戏状态
class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.finalScoreElement = document.getElementById('finalScore');
        this.realmElement = document.getElementById('realmLevel');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        
        // 游戏状态
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        this.speed = CONFIG.INITIAL_SPEED;
        
        // 灵蛇的初始状态
        this.snake = [
            { x: 200, y: 200 },
            { x: 180, y: 200 },
            { x: 160, y: 200 }
        ];
        
        // 移动方向
        this.direction = { x: CONFIG.GRID_SIZE, y: 0 };
        this.nextDirection = { x: CONFIG.GRID_SIZE, y: 0 };
        
        // 仙丹位置
        this.food = this.generateFood();
        
        // 灵气粒子效果
        this.spiritualParticles = [];
        
        // 当前修为境界
        this.currentRealm = CONFIG.REALMS[0];
        
        // 游戏循环ID
        this.gameLoopId = null;
        
        this.init();
    }
    
    init() {
        this.updateHighScore();
        this.updateRealm();
        this.bindEvents();
        this.draw();
    }
    
    bindEvents() {
        // 按钮事件
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        
        // 速度选择
        document.getElementById('speedSelect').addEventListener('change', (e) => {
            this.speed = parseInt(e.target.value);
        });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // 防止方向键滚动页面
        document.addEventListener('keydown', (e) => {
            if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });
    }
    
    handleKeyPress(event) {
        if (!this.gameRunning) return;
        
        const { x: currentX, y: currentY } = this.direction;
        
        switch (event.code) {
            case 'ArrowUp':
                if (currentY === 0) {
                    this.nextDirection = { x: 0, y: -CONFIG.GRID_SIZE };
                }
                break;
            case 'ArrowDown':
                if (currentY === 0) {
                    this.nextDirection = { x: 0, y: CONFIG.GRID_SIZE };
                }
                break;
            case 'ArrowLeft':
                if (currentX === 0) {
                    this.nextDirection = { x: -CONFIG.GRID_SIZE, y: 0 };
                }
                break;
            case 'ArrowRight':
                if (currentX === 0) {
                    this.nextDirection = { x: CONFIG.GRID_SIZE, y: 0 };
                }
                break;
            case 'Space':
                this.togglePause();
                break;
        }
    }
    
    startGame() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.gamePaused = false;
        this.updateButtons();
        this.gameLoop();
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        this.updateButtons();
        
        if (!this.gamePaused) {
            this.gameLoop();
        }
    }
    
    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.snake = [
            { x: 200, y: 200 },
            { x: 180, y: 200 },
            { x: 160, y: 200 }
        ];
        this.direction = { x: CONFIG.GRID_SIZE, y: 0 };
        this.nextDirection = { x: CONFIG.GRID_SIZE, y: 0 };
        this.food = this.generateFood();
        this.spiritualParticles = [];
        this.currentRealm = CONFIG.REALMS[0];
        
        if (this.gameLoopId) {
            clearTimeout(this.gameLoopId);
        }
        
        this.updateScore();
        this.updateRealm();
        this.updateButtons();
        this.hideGameOver();
        this.draw();
    }
    
    restartGame() {
        this.hideGameOver();
        this.resetGame();
        this.startGame();
    }
    
    gameLoop() {
        if (!this.gameRunning || this.gamePaused) return;
        
        this.update();
        this.draw();
        
        this.gameLoopId = setTimeout(() => this.gameLoop(), this.speed);
    }
    
    update() {
        // 更新方向
        this.direction = { ...this.nextDirection };
        
        // 更新灵气粒子
        this.updateSpiritualParticles();
        
        // 计算新的头部位置
        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;
        
        // 检查碰撞
        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }
        
        // 添加新头部
        this.snake.unshift(head);
        
        // 检查是否吞噬仙丹
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.updateRealm();
            this.createSpiritualParticles(this.food.x, this.food.y);
            this.food = this.generateFood();
            
            // 修为提升，灵蛇移动更快
            if (this.score % 50 === 0 && this.speed > 50) {
                this.speed -= 5;
            }
        } else {
            // 移除尾部
            this.snake.pop();
        }
    }
    
    checkCollision(head) {
        // 检查墙壁碰撞
        if (head.x < 0 || head.x >= CONFIG.CANVAS_SIZE || 
            head.y < 0 || head.y >= CONFIG.CANVAS_SIZE) {
            return true;
        }
        
        // 检查自身碰撞
        return this.snake.some(segment => segment.x === head.x && segment.y === head.y);
    }
    
    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * (CONFIG.CANVAS_SIZE / CONFIG.GRID_SIZE)) * CONFIG.GRID_SIZE,
                y: Math.floor(Math.random() * (CONFIG.CANVAS_SIZE / CONFIG.GRID_SIZE)) * CONFIG.GRID_SIZE
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        
        return newFood;
    }
    
    draw() {
        // 清空画布
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
        
        // 绘制渐变背景
        this.drawMysticBackground();
        
        // 绘制网格
        this.drawGrid();
        
        // 绘制灵气粒子
        this.drawSpiritualParticles();
        
        // 绘制仙丹
        this.drawFood();
        
        // 绘制灵蛇
        this.drawSnake();
    }
    
    drawMysticBackground() {
        // 绘制神秘的渐变背景
        const gradient = this.ctx.createRadialGradient(
            CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2, 0,
            CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2
        );
        gradient.addColorStop(0, 'rgba(30, 41, 59, 0.3)');
        gradient.addColorStop(0.5, 'rgba(51, 65, 85, 0.2)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.1)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = CONFIG.COLORS.GRID;
        this.ctx.lineWidth = 0.5;
        this.ctx.globalAlpha = 0.3;
        
        for (let i = 0; i <= CONFIG.CANVAS_SIZE; i += CONFIG.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, CONFIG.CANVAS_SIZE);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(CONFIG.CANVAS_SIZE, i);
            this.ctx.stroke();
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawSpiritualParticles() {
        // 绘制灵气粒子效果
        this.spiritualParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            // 创建灵气粒子的渐变
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            gradient.addColorStop(0, CONFIG.COLORS.SPIRITUAL_ENERGY);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    drawSnake() {
        this.snake.forEach((segment, index) => {
            if (index === 0) {
                // 绘制灵蛇头部
                this.drawSpiritualSnakeHead(segment);
            } else {
                // 绘制灵蛇身体
                this.drawSpiritualSnakeBody(segment, index);
            }
        });
    }
    
    drawSpiritualSnakeHead(head) {
        // 绘制发光的灵蛇头部
        this.ctx.save();
        
        // 头部光晕效果
        const glowGradient = this.ctx.createRadialGradient(
            head.x + CONFIG.GRID_SIZE / 2, head.y + CONFIG.GRID_SIZE / 2, 0,
            head.x + CONFIG.GRID_SIZE / 2, head.y + CONFIG.GRID_SIZE / 2, CONFIG.GRID_SIZE
        );
        glowGradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
        glowGradient.addColorStop(1, 'rgba(99, 102, 241, 0.1)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.fillRect(head.x - 5, head.y - 5, CONFIG.GRID_SIZE + 10, CONFIG.GRID_SIZE + 10);
        
        // 头部本体
        this.ctx.fillStyle = CONFIG.COLORS.SNAKE_HEAD;
        this.ctx.fillRect(head.x + 2, head.y + 2, CONFIG.GRID_SIZE - 4, CONFIG.GRID_SIZE - 4);
        
        // 头部边框
        this.ctx.strokeStyle = '#4f46e5';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(head.x + 2, head.y + 2, CONFIG.GRID_SIZE - 4, CONFIG.GRID_SIZE - 4);
        
        // 绘制灵蛇眼睛
        this.drawSpiritualSnakeEyes(head);
        
        this.ctx.restore();
    }
    
    drawSpiritualSnakeBody(segment, index) {
        // 绘制渐变的灵蛇身体
        const alpha = Math.max(0.6, 1 - index * 0.05);
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // 身体渐变色
        const bodyGradient = this.ctx.createLinearGradient(
            segment.x, segment.y,
            segment.x + CONFIG.GRID_SIZE, segment.y + CONFIG.GRID_SIZE
        );
        bodyGradient.addColorStop(0, CONFIG.COLORS.SNAKE_BODY);
        bodyGradient.addColorStop(1, CONFIG.COLORS.SNAKE_BODY_GRADIENT);
        
        this.ctx.fillStyle = bodyGradient;
        this.ctx.fillRect(segment.x + 2, segment.y + 2, CONFIG.GRID_SIZE - 4, CONFIG.GRID_SIZE - 4);
        
        // 身体边框
        this.ctx.strokeStyle = '#6366f1';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(segment.x + 2, segment.y + 2, CONFIG.GRID_SIZE - 4, CONFIG.GRID_SIZE - 4);
        
        this.ctx.restore();
    }
    
    drawSpiritualSnakeEyes(head) {
        // 绘制发光的灵蛇眼睛
        const eyeSize = 4;
        const pupilSize = 2;
        
        let eyePositions = [];
        
        if (this.direction.x > 0) { // 向右
            eyePositions = [
                { x: head.x + 12, y: head.y + 5 },
                { x: head.x + 12, y: head.y + 12 }
            ];
        } else if (this.direction.x < 0) { // 向左
            eyePositions = [
                { x: head.x + 4, y: head.y + 5 },
                { x: head.x + 4, y: head.y + 12 }
            ];
        } else if (this.direction.y > 0) { // 向下
            eyePositions = [
                { x: head.x + 5, y: head.y + 12 },
                { x: head.x + 12, y: head.y + 12 }
            ];
        } else if (this.direction.y < 0) { // 向上
            eyePositions = [
                { x: head.x + 5, y: head.y + 4 },
                { x: head.x + 12, y: head.y + 4 }
            ];
        }
        
        eyePositions.forEach(pos => {
            // 眼白
            this.ctx.fillStyle = '#f0f8ff';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, eyeSize, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // 瞳孔
            this.ctx.fillStyle = '#000080';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, pupilSize, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // 眼睛发光效果
            const eyeGlow = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, eyeSize + 2);
            eyeGlow.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
            eyeGlow.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = eyeGlow;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, eyeSize + 2, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }
    
    drawFood() {
        const centerX = this.food.x + CONFIG.GRID_SIZE / 2;
        const centerY = this.food.y + CONFIG.GRID_SIZE / 2;
        const radius = CONFIG.GRID_SIZE / 2 - 2;
        
        this.ctx.save();
        
        // 仙丹外层光晕
        const outerGlow = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius + 8
        );
        outerGlow.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
        outerGlow.addColorStop(0.7, 'rgba(220, 38, 38, 0.4)');
        outerGlow.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = outerGlow;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // 仙丹主体
        const pillGradient = this.ctx.createRadialGradient(
            centerX - 3, centerY - 3, 0,
            centerX, centerY, radius
        );
        pillGradient.addColorStop(0, '#f59e0b');
        pillGradient.addColorStop(0.3, CONFIG.COLORS.FOOD);
        pillGradient.addColorStop(1, '#991b1b');
        
        this.ctx.fillStyle = pillGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // 仙丹边框
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // 内部符文效果（简化的太极图案）
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - 2, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#991b1b';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY + 2, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // 闪烁效果
        const time = Date.now() * 0.005;
        const sparkleAlpha = (Math.sin(time) + 1) * 0.3 + 0.4;
        this.ctx.globalAlpha = sparkleAlpha;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(centerX - 4, centerY - 4, 2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
            this.updateHighScore();
        }
    }
    
    updateHighScore() {
        this.highScoreElement.textContent = this.highScore;
    }
    
    updateRealm() {
        // 根据分数更新修为境界
        for (let i = CONFIG.REALMS.length - 1; i >= 0; i--) {
            const realm = CONFIG.REALMS[i];
            if (this.score >= realm.minScore) {
                this.currentRealm = realm;
                break;
            }
        }
        this.realmElement.textContent = this.currentRealm.name;
    }
    
    createSpiritualParticles(x, y) {
        // 创建灵气粒子效果
        for (let i = 0; i < 8; i++) {
            this.spiritualParticles.push({
                x: x + CONFIG.GRID_SIZE / 2,
                y: y + CONFIG.GRID_SIZE / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30,
                maxLife: 30,
                size: Math.random() * 3 + 1
            });
        }
    }
    
    updateSpiritualParticles() {
        // 更新灵气粒子
        this.spiritualParticles = this.spiritualParticles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            return particle.life > 0;
        });
    }
    
    updateButtons() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (!this.gameRunning) {
            startBtn.textContent = '开始游戏';
            startBtn.disabled = false;
            pauseBtn.textContent = '暂停';
            pauseBtn.disabled = true;
        } else if (this.gamePaused) {
            startBtn.disabled = true;
            pauseBtn.textContent = '继续';
            pauseBtn.disabled = false;
        } else {
            startBtn.disabled = true;
            pauseBtn.textContent = '暂停';
            pauseBtn.disabled = false;
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        this.gamePaused = false;
        
        if (this.gameLoopId) {
            clearTimeout(this.gameLoopId);
        }
        
        this.finalScoreElement.textContent = this.score;
        this.showGameOver();
        this.updateButtons();
    }
    
    showGameOver() {
        this.gameOverScreen.classList.remove('hidden');
    }
    
    hideGameOver() {
        this.gameOverScreen.classList.add('hidden');
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});

// 添加触摸控制支持（移动端）
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // 最小滑动距离
    if (Math.max(absDeltaX, absDeltaY) < 30) return;
    
    let keyCode;
    if (absDeltaX > absDeltaY) {
        keyCode = deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
    } else {
        keyCode = deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
    }
    
    // 模拟键盘事件
    const event = new KeyboardEvent('keydown', { code: keyCode });
    document.dispatchEvent(event);
    
    touchStartX = 0;
    touchStartY = 0;
}, { passive: true }); 