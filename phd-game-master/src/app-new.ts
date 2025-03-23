import { GameEngine, GameConfig, GameActionProxy, GameEndEvent} from './gameEngine';
import { EndGameState } from './endGameState';
import { TemplateUIProxy } from './bridgeUI';
import { LocalizationDictionary } from './i18n/localization';
import { SimpleGameTextEngine } from './gui/textEngine';
import { downloadAndParse } from './utils/network';
import { load as loadYaml } from 'js-yaml';
import queryString from 'query-string';

interface AppConfig extends GameConfig {
    languageFileUrl?: string;
}

// Initialization for the template-based UI
class TemplateGameApp {
    private gameEngine: GameEngine;
    private uiProxy: TemplateUIProxy;
    private localizer: LocalizationDictionary;
    private config: AppConfig;
    private updateInterval: number = 50;
    
    constructor(config: AppConfig) {
        this.config = config;
        this.uiProxy = new TemplateUIProxy();
        this.localizer = new LocalizationDictionary();
        this.gameEngine = new GameEngine(config, this.uiProxy);
    }
    
    async initialize(): Promise<void> {
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
        
        // Prepare the game template integration
        this.setupGameTemplate();
    }
    
    async start(newSeed = false): Promise<void> {
        await this.gameEngine.start(newSeed);
        this.startGameLoop();
        
        // Update the HUD initially
        this.updateHUD();
    }
    
    private setupGameTemplate(): void {
        // Override the template's Game class to integrate our game
        (window as any).initializePhDGame = (gameUI: any) => {
            // Connect our UI proxy to the template's UI
            this.uiProxy.attachUI(gameUI);
            
            // Update game title and instructions
            document.getElementById('game-title')!.textContent = 'PhD Simulator';
            
            // Update instructions
            const instructionsContainer = document.querySelector('#instructions-screen .container');
            if (instructionsContainer) {
                instructionsContainer.innerHTML = `
                    <h2>PhD Simulator</h2>
                    <h3>How to Play:</h3>
                    <p>You are a PhD student trying to graduate by publishing papers. Each month you'll make decisions about how to spend your time.</p>
                    <ul>
                        <li>Read papers to get new ideas</li>
                        <li>Develop ideas into preliminary results</li>
                        <li>Create figures and write papers</li>
                        <li>Handle paper rejections and revisions</li>
                        <li>Maintain your hope (mental health) level</li>
                    </ul>
                    <h3>Goal:</h3>
                    <p>Publish 3 papers to graduate with your PhD degree before running out of hope or time.</p>
                    <button id="instructions-back-button">Back</button>
                `;
            }
            
            // Override template game logic
            return {
                startGame: () => {
                    this.start(true);
                },
                updateGame: () => {
                    // This will be called by the template's game loop
                    this.updateHUD();
                },
                resetGame: () => {
                    // Called when resetting the game
                },
                pause: () => {
                    // Handle pause functionality 
                },
                resume: () => {
                    this.startGameLoop();
                }
            };
        };
    }
    
    private startGameLoop(): void {
        console.log("Starting game loop");
        // Process game ticks at regular intervals
        setTimeout(() => this.gameTick(), this.updateInterval);
    }
    
    private async gameTick(): Promise<void> {
        console.log("Game tick");
        await this.gameEngine.tick();
        
        // Update UI
        this.updateHUD();
        
        // Continue the game loop
        setTimeout(() => this.gameTick(), this.updateInterval);
    }
    
    private updateHUD(): void {
        if (this.uiProxy instanceof TemplateUIProxy) {
            this.uiProxy.updateHUD(this.gameEngine);
        }
    }
    
    private handleGameEnd(event: GameEndEvent): void {
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

// Load configuration and initialize the game
document.addEventListener('DOMContentLoaded', async () => {
    // Parse configuration from the JSON in the page
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
    
    // Initialize and start the game
    const app = new TemplateGameApp(appConfig);
    await app.initialize();
});