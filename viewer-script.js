// Scripts for recipe-viewer.html

// Global variables
let recipe = null;
let currentPhase = 'prep'; // 'prep' or 'cooking'
let currentStepIndex = 0;
let currentSteps = [];
let totalSteps = 0;
let timerInterval;
let timerSeconds = 0;
let timerRunning = false;
let speechRecognition = null;
let isVoiceActive = false;

// DOM elements
const recipeIntro = document.getElementById('recipe-intro');
const recipeSteps = document.getElementById('recipe-steps');
const startRecipeBtn = document.getElementById('start-recipe');
const prevStepBtn = document.getElementById('prev-step');
const nextStepBtn = document.getElementById('next-step');
const readStepBtn = document.getElementById('read-step');
const finishRecipeBtn = document.getElementById('finish-recipe');
const stepProgress = document.getElementById('step-progress');
const stepNumberEl = document.getElementById('step-number');
const mainStepEl = document.getElementById('main-step');
const bulletListEl = document.getElementById('bullet-list');
const prepPhase = document.getElementById('prep-phase');
const cookingPhase = document.getElementById('cooking-phase');
const voiceCommandBtn = document.getElementById('voice-command-button');
const voiceStatus = document.getElementById('voice-status');
const shoppingListBtn = document.getElementById('shopping-list');
const shoppingListModal = document.getElementById('shopping-list-modal');
const closeModalBtn = document.querySelector('.close-button');
const printListBtn = document.getElementById('print-list');

// Timer elements
const timerContainer = document.getElementById('timer-container');
const startTimerBtn = document.getElementById('start-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const timerDisplay = document.getElementById('timer-display');

// Load recipe when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get recipe ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    
    if (recipeId) {
        loadRecipe(recipeId);
    } else {
        // If no recipe ID is provided, redirect to the recipe list
        window.location.href = 'index.html';
    }
    
    // Set up event listeners
    setupEventListeners();
});

// Function to load recipe data
async function loadRecipe(recipeId) {
    try {
        const response = await fetch(`recipes/${recipeId}.json`);
        
        if (!response.ok) {
            throw new Error('Recipe not found');
        }
        
        recipe = await response.json();
        
        // Set up the recipe data
        initializeRecipe();
        
        // Set up the ingredients list
        populateIngredientsList();
        
        // Set up the current steps
        currentSteps = recipe.preparationSteps;
        totalSteps = recipe.preparationSteps.length + recipe.cookingSteps.length;
        
    } catch (error) {
        console.error('Error loading recipe:', error);
        document.body.innerHTML = `
            <div class="container">
                <div class="error-message">
                    <h2>Oops! Recipe Not Found</h2>
                    <p>We couldn't find the recipe you're looking for.</p>
                    <p>Error: ${error.message}</p>
                    <a href="index.html" class="primary-button">Back to Recipe List</a>
                </div>
            </div>
        `;
    }
}

// Initialize recipe data in the UI
function initializeRecipe() {
    // Set recipe metadata
    document.title = `${recipe.title} - Recipe Viewer`;
    document.getElementById('recipe-title').textContent = recipe.title;
    document.getElementById('recipe-image').src = recipe.metadata.imageUrl;
    document.getElementById('recipe-image').alt = recipe.title;
    document.getElementById('recipe-yields').textContent = recipe.metadata.yields;
    document.getElementById('recipe-total-time').textContent = recipe.metadata.totalTime;
    document.getElementById('recipe-prep-time').textContent = recipe.metadata.prepTime;
    document.getElementById('recipe-active-time').textContent = recipe.metadata.activeTime;
    document.getElementById('recipe-hands-off-time').textContent = recipe.metadata.handsOffTime;
}

// Populate the ingredients list
function populateIngredientsList() {
    const ingredientsList = document.getElementById('ingredients-list');
    ingredientsList.innerHTML = '';
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = `${ingredient.quantity} ${ingredient.name}`;
            ingredientsList.appendChild(li);
        });
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Start recipe button
    startRecipeBtn.addEventListener('click', () => {
        recipeIntro.style.display = 'none';
        recipeSteps.style.display = 'block';
        updateStepDisplay();
    });
    
    // Navigation buttons
    prevStepBtn.addEventListener('click', goToPrevStep);
    nextStepBtn.addEventListener('click', goToNextStep);
    finishRecipeBtn.addEventListener('click', finishRecipe);
    
    // Read step button
    readStepBtn.addEventListener('click', readCurrentStep);
    
    // Voice command button
    voiceCommandBtn.addEventListener('click', toggleVoiceCommands);
    
    // Timer buttons
    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);
    
    // Shopping list modal
    shoppingListBtn.addEventListener('click', openShoppingListModal);
    closeModalBtn.addEventListener('click', closeShoppingListModal);
    printListBtn.addEventListener('click', printShoppingList);
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === shoppingListModal) {
            closeShoppingListModal();
        }
    });
}

// Update the current step display
function updateStepDisplay() {
    const currentStep = currentSteps[currentStepIndex];
    
    // Update step number and title
    stepNumberEl.textContent = currentStep.title;
    
    // Update main step instruction
    mainStepEl.textContent = currentStep.mainStep;
    
    // Update bullet points
    bulletListEl.innerHTML = '';
    if (currentStep.bullets && currentStep.bullets.length > 0) {
        currentStep.bullets.forEach(bullet => {
            const li = document.createElement('li');
            li.textContent = bullet;
            bulletListEl.appendChild(li);
        });
        bulletListEl.style.display = 'block';
    } else {
        bulletListEl.style.display = 'none';
    }
    
    // Check for timer in step content
    const timerRegex = /\((\d+)[-\s]?(\d+)?\s*minutes?\)/i;
    const combinedText = currentStep.mainStep + ' ' + (currentStep.bullets || []).join(' ');
    const timerMatch = combinedText.match(timerRegex);
    
    if (timerMatch) {
        let minutes = parseInt(timerMatch[1]);
        if (timerMatch[2]) {
            // If there's a range (e.g. "2-4 minutes"), use the average
            minutes = (parseInt(timerMatch[1]) + parseInt(timerMatch[2])) / 2;
        }
        
        timerSeconds = Math.round(minutes * 60);
        updateTimerDisplay();
        timerContainer.style.display = 'flex';
    } else {
        timerContainer.style.display = 'none';
        stopTimer();
    }
    
    // Update progress bar
    let stepsCompleted = 0;
    if (currentPhase === 'prep') {
        stepsCompleted = currentStepIndex;
    } else {
        stepsCompleted = recipe.preparationSteps.length + currentStepIndex;
    }
    
    const progress = (stepsCompleted / totalSteps) * 100;
    stepProgress.style.width = `${progress}%`;
    
    // Update navigation buttons
    const isFirstPrepStep = currentPhase === 'prep' && currentStepIndex === 0;
    const isLastCookingStep = currentPhase === 'cooking' && currentStepIndex === recipe.cookingSteps.length - 1;
    
    prevStepBtn.disabled = isFirstPrepStep;
    
    if (isLastCookingStep) {
        nextStepBtn.style.display = 'none';
        finishRecipeBtn.style.display = 'inline-block';
    } else {
        nextStepBtn.style.display = 'inline-block';
        finishRecipeBtn.style.display = 'none';
    }
}

// Navigation functions
function goToNextStep() {
    if (currentPhase === 'prep' && currentStepIndex === recipe.preparationSteps.length - 1) {
        // Switch from prep to cooking phase
        currentPhase = 'cooking';
        currentStepIndex = 0;
        currentSteps = recipe.cookingSteps;
        
        // Update phase indicators
        prepPhase.classList.remove('active');
        cookingPhase.classList.add('active');
    } else if (currentStepIndex < currentSteps.length - 1) {
        // Go to next step in current phase
        currentStepIndex++;
    }
    
    updateStepDisplay();
}

function goToPrevStep() {
    if (currentPhase === 'cooking' && currentStepIndex === 0) {
        // Switch from cooking to prep phase
        currentPhase = 'prep';
        currentStepIndex = recipe.preparationSteps.length - 1;
        currentSteps = recipe.preparationSteps;
        
        // Update phase indicators
        cookingPhase.classList.remove('active');
        prepPhase.classList.add('active');
    } else if (currentStepIndex > 0) {
        // Go to previous step in current phase
        currentStepIndex--;
    }
    
    updateStepDisplay();
}

function finishRecipe() {
    recipeSteps.style.display = 'none';
    recipeIntro.style.display = 'block';
    
    // Reset to beginning
    currentPhase = 'prep';
    currentStepIndex = 0;
    currentSteps = recipe.preparationSteps;
    
    // Reset phase indicators
    cookingPhase.classList.remove('active');
    prepPhase.classList.add('active');
    
    stopTimer();
    
    // Stop voice recognition if active
    if (isVoiceActive) {
        speechRecognition.stop();
        voiceCommandBtn.textContent = "Enable Voice Commands";
        voiceStatus.textContent = "Voice recognition stopped";
        isVoiceActive = false;
    }
    
    // Show a completion message
    alert('Congratulations! You\'ve completed the recipe. Enjoy your meal!');
}

// Timer functions
function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (!timerRunning) {
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                stopTimer();
                // Play a sound or show an alert when timer is done
                alert('Timer complete!');
            }
        }, 1000);
        
        timerRunning = true;
        startTimerBtn.style.display = 'none';
        pauseTimerBtn.style.display = 'inline-block';
        resetTimerBtn.style.display = 'inline-block';
    }
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    startTimerBtn.style.display = 'inline-block';
    pauseTimerBtn.style.display = 'none';
}

function stopTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    startTimerBtn.style.display = 'inline-block';
    pauseTimerBtn.style.display = 'none';
    resetTimerBtn.style.display = 'none';
}

function resetTimer() {
    stopTimer();
    
    // Extract timer value from current step again
    const timerRegex = /\((\d+)[-\s]?(\d+)?\s*minutes?\)/i;
    const combinedText = currentSteps[currentStepIndex].mainStep + ' ' + (currentSteps[currentStepIndex].bullets || []).join(' ');
    const timerMatch = combinedText.match(timerRegex);
    
    if (timerMatch) {
        let minutes = parseInt(timerMatch[1]);
        if (timerMatch[2]) {
            minutes = (parseInt(timerMatch[1]) + parseInt(timerMatch[2])) / 2;
        }
        
        timerSeconds = Math.round(minutes * 60);
    } else {
        timerSeconds = 0;
    }
    
    updateTimerDisplay();
}

// Speech functions with pauses
function readCurrentStep() {
    // Check if the browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
        alert('Sorry, your browser does not support text-to-speech!');
        return;
    }
    
    try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const currentStep = currentSteps[currentStepIndex];
        
        // Create an array to hold all speech parts with pauses
        const speechQueue = [];
        
        // Add main step first
        speechQueue.push({
            text: currentStep.mainStep,
            pause: 1000 // 1 second pause after main step
        });
        
        // Add each bullet with pause
        if (currentStep.bullets && currentStep.bullets.length > 0) {
            currentStep.bullets.forEach(bullet => {
                speechQueue.push({
                    text: bullet,
                    pause: 700 // 0.7 second pause after each bullet
                });
            });
        }
        
        // Function to speak the next item in the queue
        let currentIndex = 0;
        function speakNext() {
            if (currentIndex < speechQueue.length) {
                const item = speechQueue[currentIndex];
                const utterance = new SpeechSynthesisUtterance(item.text);
                
                // Set properties for better clarity
                utterance.rate = 0.9;  // Slightly slower
                utterance.pitch = 1;   // Normal pitch
                utterance.volume = 1;  // Full volume
                
                // When this item finishes speaking
                utterance.onend = function() {
                    // Pause for the specified time, then speak the next item
                    setTimeout(function() {
                        currentIndex++;
                        speakNext();
                    }, item.pause);
                };
                
                // Speak this item
                window.speechSynthesis.speak(utterance);
            }
        }
        
        // Start the speech queue
        speakNext();
        
    } catch (error) {
        console.error('Speech synthesis error:', error);
        alert('There was an error with the text-to-speech feature. Please try again.');
    }
}

// Setup Voice Recognition
function setupVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceStatus.textContent = "Voice recognition not supported in this browser";
        voiceCommandBtn.disabled = true;
        return false;
    }
    
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = false;
    
    speechRecognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        voiceStatus.textContent = `Voice command recognized: "${transcript}"`;
        
        // Process voice commands
        if (transcript.includes("next") || transcript.includes("forward")) {
            goToNextStep();
        } else if (transcript.includes("previous") || transcript.includes("back")) {
            goToPrevStep();
        } else if (transcript.includes("repeat") || transcript.includes("read")) {
            readCurrentStep();
        } else if (transcript.includes("start timer")) {
            startTimer();
        } else if (transcript.includes("pause timer") || transcript.includes("stop timer")) {
            pauseTimer();
        } else if (transcript.includes("finish") || transcript.includes("done")) {
            finishRecipe();
        }
    };
    
    speechRecognition.onerror = (event) => {
        voiceStatus.textContent = `Error occurred in recognition: ${event.error}`;
    };
    
    return true;
}

// Toggle Voice Recognition
function toggleVoiceCommands() {
    if (!speechRecognition && !setupVoiceRecognition()) {
        return; // Setup failed
    }
    
    if (isVoiceActive) {
        // Deactivate voice commands
        speechRecognition.stop();
        voiceCommandBtn.textContent = "Enable Voice Commands";
        voiceStatus.textContent = "Voice recognition stopped";
        isVoiceActive = false;
    } else {
        // Activate voice commands
        speechRecognition.start();
        voiceCommandBtn.textContent = "Disable Voice Commands";
        voiceStatus.textContent = "Listening for commands...";
        isVoiceActive = true;
    }
}

// Shopping list modal functions
function openShoppingListModal() {
    if (recipe && recipe.groceryList) {
        // Populate the shopping list
        const groceryListContainer = document.getElementById('grocery-list-container');
        groceryListContainer.innerHTML = '';
        
        // Loop through categories
        for (const category in recipe.groceryList) {
            // Create category header
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = category;
            groceryListContainer.appendChild(categoryHeader);
            
            // Create list for this category
            const list = document.createElement('ul');
            
            // Add each item in the category
            recipe.groceryList[category].forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = item;
                list.appendChild(listItem);
            });
            
            groceryListContainer.appendChild(list);
        }
        
        // Show the modal
        shoppingListModal.style.display = 'block';
    } else {
        alert('No shopping list available for this recipe.');
    }
}

function closeShoppingListModal() {
    shoppingListModal.style.display = 'none';
}

function printShoppingList() {
    const printWindow = window.open('', '_blank');
    
    // Create print content
    let printContent = `
        <html>
        <head>
            <title>Shopping List for ${recipe.title}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                h1 { color: #9d4700; text-align: center; margin-bottom: 20px; }
                h2 { color: #9d4700; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                ul { list-style-type: none; padding-left: 10px; }
                li { margin-bottom: 8px; }
                .print-date { color: #666; font-size: 0.8rem; text-align: center; margin-top: 30px; }
            </style>
        </head>
        <body>
            <h1>Shopping List for ${recipe.title}</h1>
    `;
    
    // Add each category and its items
    for (const category in recipe.groceryList) {
        printContent += `<h2>${category}</h2><ul>`;
        
        recipe.groceryList[category].forEach(item => {
            printContent += `<li>☐ ${item}</li>`;
        });
        
        printContent += `</ul>`;
    }
    
    // Add print date
    const now = new Date();
    printContent += `<div class="print-date">Generated on ${now.toLocaleDateString()}</div>`;
    
    // Close the HTML
    printContent += `</body></html>`;
    
    // Write to the new window and print
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
        printWindow.print();
    }, 250);
}