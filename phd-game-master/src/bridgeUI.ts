import { GameEngine, GameEndEvent} from './gameEngine';
import { EndGameState } from './endGameState';
import { GuiActionProxy } from './event/core';

/**
 * A proxy implementation that connects the game engine actions
 * to the modern UI template
 */
export class TemplateUIProxy implements GuiActionProxy {
    private gameUI: any = null;
    private choices: Array<[string, number]> = [];
    private modalContent: string = '';
    private choicePromiseResolve: ((value: number) => void) | null = null;
    private messagePromiseResolve: (() => void) | null = null;
    
    constructor() {
        // Will be initialized when attachUI is called
    }
    
    /**
     * Attach to the Game UI instance from the template
     */
    attachUI(ui: any): void {
        this.gameUI = ui;
        this.setupMessageContainer();
    }
    
    private setupMessageContainer(): void {
        console.log("Setting up message container...");
        // Create message container in the game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            console.log("Found game container");
            
            // Remove any existing message window if it exists
            const existingMessageWindow = document.getElementById('message-window');
            if (existingMessageWindow) {
                existingMessageWindow.remove();
            }
            
            // Create message window with very clear styling
            const messageWindow = document.createElement('div');
            messageWindow.id = 'message-window';
            messageWindow.className = 'message-window';
            messageWindow.style.backgroundColor = 'rgba(0,0,0,0.9)';
            messageWindow.style.color = 'white';
            messageWindow.style.padding = '20px';
            messageWindow.style.margin = '20px';
            messageWindow.style.borderRadius = '10px';
            messageWindow.style.position = 'absolute';
            messageWindow.style.top = '50%';
            messageWindow.style.left = '50%';
            messageWindow.style.transform = 'translate(-50%, -50%)';
            messageWindow.style.width = '80%';
            messageWindow.style.maxWidth = '600px';
            messageWindow.style.zIndex = '1000';
            messageWindow.style.border = '3px solid red'; // Very visible for debugging
            
            // Create message text container
            const messageText = document.createElement('div');
            messageText.id = 'message-text';
            messageText.className = 'message-text';
            messageText.innerHTML = "<p>Welcome to PhD Simulator!</p>"; // Initial content
            
            // Create choices container
            const choicesContainer = document.createElement('div');
            choicesContainer.id = 'choices-container';
            choicesContainer.className = 'choices-container';
            
            // Append all elements
            messageWindow.appendChild(messageText);
            messageWindow.appendChild(choicesContainer);
            gameContainer.appendChild(messageWindow);
        
            console.log("Message container setup complete");
        } else {
            console.error("Game container not found!");
        }
    }
    
    displayMessage(message: string, confirm: string, icon?: string, fx?: string): Promise<void> {
        console.log("DisplayMessage called:", message);
        const messageText = document.getElementById('message-text');
        const choicesContainer = document.getElementById('choices-container');
        
        if (messageText && choicesContainer) {
            // Display the message
            messageText.innerHTML = message;
            choicesContainer.innerHTML = '';
            
            // Create confirm button
            const confirmButton = document.createElement('button');
            confirmButton.textContent = confirm;
            confirmButton.className = 'choice-button confirm-button';
            choicesContainer.appendChild(confirmButton);
            
            // Play FX if provided
            if (fx === 'confetti') {
                this.playConfetti();
            }
            
            // Return a promise that resolves when the button is clicked
            return new Promise<void>((resolve) => {
                this.messagePromiseResolve = resolve;
                confirmButton.onclick = () => {
                    if (this.messagePromiseResolve) {
                        this.messagePromiseResolve();
                        this.messagePromiseResolve = null;
                    }
                };
            });
        }
        
        return Promise.resolve();
    }
    
    displayChoices(message: string, choices: Array<[string, number]>, icon?: string): Promise<number> {
        const messageText = document.getElementById('message-text');
        const choicesContainer = document.getElementById('choices-container');
        
        if (messageText && choicesContainer) {
            // Display the message
            messageText.innerHTML = message;
            choicesContainer.innerHTML = '';
            
            // Create choice buttons
            choices.forEach(([choiceText, choiceId]) => {
                const choiceButton = document.createElement('button');
                choiceButton.innerHTML = choiceText;
                choiceButton.className = 'choice-button';
                choiceButton.dataset.choiceId = choiceId.toString();
                choicesContainer.appendChild(choiceButton);
            });
            
            // Return a promise that resolves with the chosen option
            return new Promise<number>((resolve) => {
                this.choicePromiseResolve = resolve;
                choicesContainer.onclick = (e) => {
                    const target = e.target as HTMLElement;
                    if (target.classList.contains('choice-button') && this.choicePromiseResolve) {
                        const choiceId = parseInt(target.dataset.choiceId || '0');
                        this.choicePromiseResolve(choiceId);
                        this.choicePromiseResolve = null;
                    }
                };
            });
        }
        
        return Promise.resolve(0);
    }
    
    private playConfetti(): void {
        // Simple confetti animation
        const container = document.getElementById('game-container');
        if (!container) return;
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = -10 + 'px';
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.position = 'absolute';
            confetti.style.borderRadius = '50%';
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
                container.removeChild(confetti);
            };
        }
    }
    
    // Update HUD with game status
    updateHUD(gameEngine: GameEngine): void {
        console.log("UpdateHUD called");
        const hud = document.getElementById('hud');
        if (hud) {
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
}