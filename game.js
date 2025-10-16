// Game canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
const game = {
    health: 100,
    money: 500,
    wave: 1,
    waveInProgress: false,
    selectedTowerType: null,
    towers: [],
    enemies: [],
    projectiles: [],
    path: [
        { x: 0, y: 300 },
        { x: 200, y: 300 },
        { x: 200, y: 150 },
        { x: 500, y: 150 },
        { x: 500, y: 450 },
        { x: 700, y: 450 },
        { x: 700, y: 300 },
        { x: 800, y: 300 }
    ]
};

// Tower configurations
const towerTypes = {
    basic: {
        cost: 100,
        damage: 10,
        range: 100,
        fireRate: 1000,
        color: '#2196F3',
        projectileColor: '#64B5F6'
    },
    fast: {
        cost: 150,
        damage: 5,
        range: 80,
        fireRate: 400,
        color: '#FF9800',
        projectileColor: '#FFB74D'
    },
    strong: {
        cost: 200,
        damage: 25,
        range: 120,
        fireRate: 1500,
        color: '#F44336',
        projectileColor: '#E57373'
    }
};

// Tower class
class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = towerTypes[type];
        this.lastFired = 0;
        this.target = null;
    }

    draw() {
        // Draw range circle (faint)
        ctx.strokeStyle = this.config.color + '30';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.config.range, 0, Math.PI * 2);
        ctx.stroke();

        // Draw tower
        ctx.fillStyle = this.config.color;
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 15, this.y - 15, 30, 30);

        // Draw barrel pointing at target
        if (this.target) {
            const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, -3, 20, 6);
            ctx.restore();
        }
    }

    update(currentTime) {
        // Find closest enemy in range
        this.target = null;
        let minDist = this.config.range;

        for (const enemy of game.enemies) {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < minDist) {
                minDist = dist;
                this.target = enemy;
            }
        }

        // Fire at target
        if (this.target && currentTime - this.lastFired > this.config.fireRate) {
            this.fire();
            this.lastFired = currentTime;
        }
    }

    fire() {
        if (this.target) {
            game.projectiles.push(new Projectile(
                this.x,
                this.y,
                this.target,
                this.config.damage,
                this.config.projectileColor
            ));
        }
    }
}

// Enemy class
class Enemy {
    constructor(wave) {
        this.health = 20 + (wave * 10);
        this.maxHealth = this.health;
        this.speed = 1 + (wave * 0.1);
        this.pathIndex = 0;
        this.x = game.path[0].x;
        this.y = game.path[0].y;
        this.reward = 50 + (wave * 5);
        this.alive = true;
    }

    draw() {
        // Draw enemy
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw health bar
        const barWidth = 20;
        const barHeight = 4;
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x - barWidth / 2, this.y - 18, barWidth, barHeight);
        ctx.fillStyle = '#0f0';
        const healthWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillRect(this.x - barWidth / 2, this.y - 18, healthWidth, barHeight);
    }

    update() {
        if (this.pathIndex >= game.path.length - 1) {
            // Reached the end
            game.health -= 10;
            updateUI();
            this.alive = false;
            return;
        }

        const target = game.path[this.pathIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.speed) {
            this.pathIndex++;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.alive = false;
            game.money += this.reward;
            updateUI();
        }
    }
}

// Projectile class
class Projectile {
    constructor(x, y, target, damage, color) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 5;
        this.color = color;
        this.alive = true;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        if (!this.target.alive) {
            this.alive = false;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.speed) {
            // Hit the target
            this.target.takeDamage(this.damage);
            this.alive = false;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }
}

// Draw the path
function drawPath() {
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(game.path[0].x, game.path[0].y);
    for (let i = 1; i < game.path.length; i++) {
        ctx.lineTo(game.path[i].x, game.path[i].y);
    }
    ctx.stroke();

    // Draw path borders
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 44;
    ctx.stroke();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 40;
    ctx.stroke();

    // Draw start and end markers
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(game.path[0].x, game.path[0].y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', game.path[0].x, game.path[0].y);

    const lastPoint = game.path[game.path.length - 1];
    ctx.fillStyle = '#F44336';
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('END', lastPoint.x, lastPoint.y);
}

// Update UI
function updateUI() {
    document.getElementById('health').textContent = game.health;
    document.getElementById('money').textContent = game.money;
    document.getElementById('wave').textContent = game.wave;

    // Check game over
    if (game.health <= 0) {
        alert('Game Over! You survived ' + game.wave + ' waves.');
        resetGame();
    }
}

// Reset game
function resetGame() {
    game.health = 100;
    game.money = 500;
    game.wave = 1;
    game.waveInProgress = false;
    game.towers = [];
    game.enemies = [];
    game.projectiles = [];
    updateUI();
}

// Start wave
function startWave() {
    if (game.waveInProgress) return;

    game.waveInProgress = true;
    const enemyCount = 5 + (game.wave * 2);

    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            game.enemies.push(new Enemy(game.wave));
        }, i * 1000);
    }

    setTimeout(() => {
        checkWaveComplete();
    }, enemyCount * 1000 + 5000);
}

// Check if wave is complete
function checkWaveComplete() {
    const interval = setInterval(() => {
        if (game.enemies.length === 0) {
            clearInterval(interval);
            game.waveInProgress = false;
            game.wave++;
            game.money += 100;
            updateUI();
            alert('Wave Complete! Bonus: $100');
        }
    }, 100);
}

// Game loop
let lastTime = 0;
function gameLoop(currentTime) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw path
    drawPath();

    // Update and draw towers
    for (const tower of game.towers) {
        tower.update(currentTime);
        tower.draw();
    }

    // Update and draw enemies
    game.enemies = game.enemies.filter(enemy => {
        if (!enemy.alive) return false;
        enemy.update();
        enemy.draw();
        return true;
    });

    // Update and draw projectiles
    game.projectiles = game.projectiles.filter(projectile => {
        if (!projectile.alive) return false;
        projectile.update();
        projectile.draw();
        return true;
    });

    requestAnimationFrame(gameLoop);
}

// Canvas click handler
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!game.selectedTowerType) return;

    const type = game.selectedTowerType;
    const cost = towerTypes[type].cost;

    // Check if player has enough money
    if (game.money < cost) {
        alert('Not enough money!');
        return;
    }

    // Check if position is valid (not on path)
    let onPath = false;
    for (let i = 0; i < game.path.length - 1; i++) {
        const p1 = game.path[i];
        const p2 = game.path[i + 1];
        const dist = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (dist < 40) {
            onPath = true;
            break;
        }
    }

    if (onPath) {
        alert('Cannot place tower on the path!');
        return;
    }

    // Check if too close to another tower
    for (const tower of game.towers) {
        const dist = Math.hypot(x - tower.x, y - tower.y);
        if (dist < 40) {
            alert('Too close to another tower!');
            return;
        }
    }

    // Place the tower
    game.towers.push(new Tower(x, y, type));
    game.money -= cost;
    updateUI();
});

// Distance to line segment helper
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    return Math.hypot(px - nearestX, py - nearestY);
}

// Tower selection
document.querySelectorAll('.tower-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const cost = parseInt(btn.dataset.cost);

        if (game.money < cost) {
            alert('Not enough money!');
            return;
        }

        // Update selection
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        game.selectedTowerType = type;
    });
});

// Start wave button
document.getElementById('startWave').addEventListener('click', () => {
    startWave();
});

// Initialize game
updateUI();
gameLoop(0);
