import { GameEngine, GameConfig, GameEndEvent } from './gameEngine';
import { EndGameState } from './endGameState';
import { LocalizationDictionary } from './i18n/localization';
import { GuiActionProxy } from './event/core';
import { downloadAndParse } from './utils/network';
import { load as loadYaml } from 'js-yaml';
import queryString from 'query-string';


interface AppConfig extends GameConfig {
    languageFileUrl?: string;
}

// UI Proxy for the game engine
class DirectUIProxy implements GuiActionProxy {
    private messageWindow: HTMLElement | null = null;
    private messageText: HTMLElement | null = null;
    private choicesContainer: HTMLElement | null = null;
    private _guiGame: any = null;  // Required by GuiActionProxy interface
    
    constructor() {
        // Will initialize on first use
    }

    attachGui(gui: any): void {
        this._guiGame = gui;
    }
    
    ensureUIElements(): void {
        // If already initialized, return
        if (this.messageWindow && this.messageText && this.choicesContainer) {
            return;
        }
        
        
        // Find or create game container
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            console.error("Game container not found");
            return;
        }
        
        // Check if message window already exists
        let existingWindow = document.getElementById('message-window');
        if (existingWindow) {
            this.messageWindow = existingWindow;
            this.messageText = document.getElementById('message-text');
            this.choicesContainer = document.getElementById('choices-container');
            return;
        }
        
        // Create UI elements
        this.messageWindow = document.createElement('div');
        this.messageWindow.id = 'message-window';
        this.messageWindow.style.backgroundColor = 'rgba(15, 52, 96, 0.95)';
        this.messageWindow.style.border = '2px solid #e94560';
        this.messageWindow.style.boxShadow = '0 0 10px rgba(233, 69, 96, 0.5)';
        this.messageWindow.style.color = 'white';
        this.messageWindow.style.padding = '20px';
        this.messageWindow.style.margin = '20px';
        this.messageWindow.style.borderRadius = '10px';
        this.messageWindow.style.maxHeight = '80%';
        this.messageWindow.style.overflowY = 'auto';
        this.messageWindow.style.position = 'absolute';
        this.messageWindow.style.top = '50%';
        this.messageWindow.style.left = '50%';
        this.messageWindow.style.transform = 'translate(-50%, -50%)';
        this.messageWindow.style.width = '80%';
        this.messageWindow.style.maxWidth = '600px';
        this.messageWindow.style.zIndex = '100';
        
        this.messageText = document.createElement('div');
        this.messageText.id = 'message-text';
        this.messageText.style.marginBottom = '20px';
        
        this.choicesContainer = document.createElement('div');
        this.choicesContainer.id = 'choices-container';
        this.choicesContainer.style.display = 'flex';
        this.choicesContainer.style.flexDirection = 'column';
        this.choicesContainer.style.gap = '10px';
        
        this.messageWindow.appendChild(this.messageText);
        this.messageWindow.appendChild(this.choicesContainer);
        gameContainer.appendChild(this.messageWindow);
        
    }
    
    displayMessage(message: string, confirm: string, icon?: string, fx?: string): Promise<void> {
        this.ensureUIElements();
        
        if (!this.messageText || !this.choicesContainer) {
            return Promise.resolve();
        }
        
        // Display the message
        this.messageText.innerHTML = message;
        this.choicesContainer.innerHTML = '';
        
        // Create confirm button
        const confirmButton = document.createElement('button');
        confirmButton.textContent = confirm;
        confirmButton.style.backgroundColor = 'rgba(69, 162, 71, 0.8)';
        confirmButton.style.color = 'white';
        confirmButton.style.border = '2px solid white';
        confirmButton.style.borderRadius = '8px';
        confirmButton.style.padding = '10px 20px';
        confirmButton.style.margin = '10px auto';
        confirmButton.style.display = 'block';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontFamily = "'Orbitron', sans-serif";
        confirmButton.style.width = '50%';
        this.choicesContainer.appendChild(confirmButton);
        
        // Play FX if provided
        if (fx === 'confetti') {
            this.playConfetti();
        }
        
        // Return a promise that resolves when the button is clicked
        return new Promise<void>((resolve) => {
            confirmButton.onclick = () => {
                resolve();
            };
        });
    }
    
    displayChoices(message: string, choices: Array<[string, number]>, icon?: string): Promise<number> {
        this.ensureUIElements();
        
        if (!this.messageText || !this.choicesContainer) {
            return Promise.resolve(0);
        }
        
        // Display the message
        this.messageText.innerHTML = message;
        this.choicesContainer.innerHTML = '';
        
        // Create choice buttons
        choices.forEach(([choiceText, choiceId]) => {
            const choiceButton = document.createElement('button');
            choiceButton.innerHTML = choiceText;
            choiceButton.style.backgroundColor = 'rgba(40, 60, 134, 0.8)';
            choiceButton.style.color = 'white';
            choiceButton.style.border = '2px solid white';
            choiceButton.style.borderRadius = '8px';
            choiceButton.style.padding = '10px 20px';
            choiceButton.style.margin = '5px 0';
            choiceButton.style.cursor = 'pointer';
            choiceButton.style.fontFamily = "'Orbitron', sans-serif";
            choiceButton.style.textAlign = 'left';
            choiceButton.dataset.choiceId = choiceId.toString();
            this.choicesContainer?.appendChild(choiceButton);
        });
        
        // Return a promise that resolves with the chosen option
        return new Promise<number>((resolve) => {
            const clickHandler = (e: Event) => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'BUTTON' && target.dataset.choiceId) {
                    const choiceId = parseInt(target.dataset.choiceId);
                    // Remove the event listener to prevent multiple clicks
                    if (this.choicesContainer) {
                        this.choicesContainer.removeEventListener('click', clickHandler);
                    }
                    resolve(choiceId);
                }
            };
            
            if (this.choicesContainer) {
                this.choicesContainer.addEventListener('click', clickHandler);
            }
        });
    }
    
    private playConfetti(): void {
        // Simple confetti animation
        const container = document.getElementById('game-container');
        if (!container) return;
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
            confetti.style.borderRadius = '50%';
            confetti.style.top = '-10px';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.zIndex = '1000';
            
            container.appendChild(confetti);
            
            // Animation
            const animation = confetti.animate(
                [
                    { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                    { transform: `translateY(${container.clientHeight}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
                ],
                {
                    duration: 1500 + Math.random() * 1000,
                    easing: 'cubic-bezier(0.37, 0, 0.63, 1)'
                }
            );
            
            animation.onfinish = () => {
                if (container.contains(confetti)) {
                    container.removeChild(confetti);
                }
            };
        }
    }
    
    updateHUD(gameEngine: GameEngine): void {
        const hud = document.getElementById('hud');
        if (!hud) return;
        
        // Get values from the game engine
        const year = gameEngine.variableStore.getVar('year', false) || 1;
        const month = gameEngine.variableStore.getVar('month', false) || 1;
        const hope = gameEngine.variableStore.getVar('player.hope', false) || 50;
        const papers = gameEngine.inventory.count('paper');
        const requiredPapers = gameEngine.variableStore.getVar('rule.papersRequired', false) || 3;
        
        // Create a status bar for hope
        const hopePercentage = Math.max(0, Math.min(100, hope));
        const hopeColor = hope > 40 ? '#4CAF50' : hope > 20 ? '#FFC107' : '#F44336';
        
        hud.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px;">
                <div style="font-size: 14px;">Year ${year}, Month ${month}</div>
                <div style="font-size: 14px;">Papers: ${papers}/${requiredPapers}</div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span>Hope:</span>
                    <div style="background-color: #333; width: 100px; height: 15px; border-radius: 10px; overflow: hidden;">
                        <div style="background-color: ${hopeColor}; width: ${hopePercentage}%; height: 100%;"></div>
                    </div>
                    <span>${Math.floor(hope)}%</span>
                </div>
            </div>
        `;
    }
}

// Main game application
class TemplateGameApp {
    private gameEngine: GameEngine;
    private uiProxy: DirectUIProxy;
    private localizer: LocalizationDictionary;
    private config: AppConfig;
    private gameLoopActive: boolean = false;
    private tickInProgress: boolean = false;
    
    constructor(config: AppConfig) {
        this.config = config;
        this.uiProxy = new DirectUIProxy();
        this.localizer = new LocalizationDictionary();
        this.gameEngine = new GameEngine(config, this.uiProxy);
    }
    
    async initialize(): Promise<void> {
        
        try {
            // Load language file
            if (this.config.languageFileUrl) {
                await this.localizer.loadFrom(this.config.languageFileUrl);
            }
            
            // Setup game end handler
            this.gameEngine.onGameEnd = (sender, event) => {
                this.handleGameEnd(event);
            };
            
            // Load game data
            await this.gameEngine.loadGameData();
            
            // Register our game with the window object
            this.registerWithWindow();
            
            // Initialize the UI proxy
            this.uiProxy.ensureUIElements();
            
        } catch (error) {
            console.error("Initialization error:", error);
        }
    }
    
    registerWithWindow(): void {
        
        // Call the initialization function if it exists
        if (typeof (window as any).initPhDInterface === 'function') {
            (window as any).initPhDInterface();
        }
        
        // Register our game functions
        (window as any).phdGame = {
            start: this.start.bind(this),
            updateHUD: () => this.uiProxy.updateHUD(this.gameEngine),
            displayMessage: (msg: string, confirm: string) => this.uiProxy.displayMessage(msg, confirm),
            displayChoices: (msg: string, choices: Array<[string, number]>) => this.uiProxy.displayChoices(msg, choices)
        };
        
    }
    
    async start(newSeed = false): Promise<void> {
        try {
            // Ensure UI is ready
            this.uiProxy.ensureUIElements();
            
            // Start the game engine
            await this.gameEngine.start(newSeed);
            
            // Update HUD
            this.uiProxy.updateHUD(this.gameEngine);
            
            // Start game loop
            this.startGameLoop();
        } catch (error) {
            console.error("Error starting game:", error);
        }
    }
    
    startGameLoop(): void {
        // If already active, do nothing
        if (this.gameLoopActive) return;
        
        // Stop any existing game loop
        this.gameLoopActive = false;
        this.tickInProgress = false;
        
        // Start a new game loop
        setTimeout(() => {
            this.gameLoopActive = true;
            this.gameTick();
        }, 200);
    }
    
    private async gameTick(): Promise<void> {
        if (!this.gameLoopActive) return;
        
        if (this.tickInProgress) {
            // Schedule another attempt later
            setTimeout(() => this.gameTick(), 200);
            return;
        }
        
        this.tickInProgress = true;
        try {
            await this.gameEngine.tick();
            this.uiProxy.updateHUD(this.gameEngine);
        } catch (error) {
            console.error("Error in game tick:", error);
        } finally {
            this.tickInProgress = false;
        }
        
        // Schedule next tick
        if (this.gameLoopActive) {
            setTimeout(() => this.gameTick(), 200);
        }
    }
    
    private handleGameEnd(event: GameEndEvent): void {
        
        // Stop the game loop
        this.gameLoopActive = false;
        
        // Switch to the game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        const gameScreen = document.getElementById('game-screen');
        
        if (gameOverScreen && gameScreen) {
            gameScreen.classList.remove('active');
            gameOverScreen.classList.add('active');
            
            // Update game over message
            const gameOverMessage = document.getElementById('game-over-message');
            if (gameOverMessage) {
                if (event.state === EndGameState.Win) {
                    gameOverMessage.innerHTML = '<h2>Congratulations!</h2><p>You have earned your PhD degree!</p>';
                } else {
                    gameOverMessage.innerHTML = '<h2>Game Over</h2><p>Your PhD journey has ended prematurely.</p><p>Better luck next time!</p>';
                }
            }
        }
    }
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    
    try {
        // Parse configuration
        let appConfig: AppConfig = {
            languageFileUrl: 'rulesets/default/lang.yaml',
            attributeDefinitionUrl: 'rulesets/default/attributes.yaml',
            itemDefinitionUrl: 'rulesets/default/items.yaml',
            statusDefinitionUrl: 'rulesets/default/status.yaml',
            eventDefinitionUrl: 'rulesets/default/events.yaml'
        };
        
        // Parse URL for seed
        let parsedHash = queryString.parse(window.location.hash || '');
        let seed = parsedHash['init_seed'];
        if (typeof seed === 'string') {
            appConfig['initialRandomSeed'] = seed;
        }
        
        // Initialize game
        const app = new TemplateGameApp(appConfig);
        await app.initialize();
        
        // Add direct play button listener to make sure it works
        const playButton = document.getElementById('play-button');
        if (playButton) {
            playButton.addEventListener('click', () => {
                // Switch to game screen directly
                const startMenuScreen = document.getElementById('start-menu-screen');
                const gameScreen = document.getElementById('game-screen');
                const hud = document.getElementById('hud');
                const gameControls = document.getElementById('game-controls');
                
                if (startMenuScreen && gameScreen) {
                    startMenuScreen.classList.remove('active');
                    gameScreen.classList.add('active');
                    
                    if (hud) hud.style.display = 'block';
                    if (gameControls) gameControls.style.display = 'block';
                    
                    // Start the game
                    app.start(true);
                }
            });
        }
    } catch (error) {
        console.error("Error initializing game:", error);
    }
});