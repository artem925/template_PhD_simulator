const audioFiles = {
    tap: new Audio('assets/audio/sfx/tap.ogg'),
    gameOver: new Audio('assets/audio/sfx/game_over.ogg'),
};

function preloadAudio() {
    Object.keys(audioFiles).forEach(key => {
        audioFiles[key].load();
    });
}

function playSound(id) {
    if (audioFiles[id]) {
        audioFiles[id].currentTime = 0; // Reset sound
        audioFiles[id].play();
    }
}

// Preload audio on game start
preloadAudio();
