// Main scripts for index.html (recipe list page)

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, calling loadRecipeList()");
    loadRecipeList();
});

// Function to fetch and display the list of recipes
async function loadRecipeList() {
    console.log("loadRecipeList() function started");
    try {
        const recipeGrid = document.getElementById('recipe-grid');
        console.log("Recipe grid element:", recipeGrid);
        
        // Clear any example/loading content first
        recipeGrid.innerHTML = '';
        
        // Fetch the recipe index
        console.log("Attempting to fetch recipes/index.json");
        const response = await fetch('recipes/index.json');
        console.log("Fetch response:", response);
        
        if (!response.ok) {
            throw new Error(`Failed to load recipe index: ${response.status}`);
        }
        
        const recipeIndex = await response.json();
        console.log("Recipes loaded:", recipeIndex);
        
        // Create a card for each recipe
        if (recipeIndex.recipes && recipeIndex.recipes.length > 0) {
            console.log(`Creating ${recipeIndex.recipes.length} recipe cards`);
            recipeIndex.recipes.forEach(recipe => {
                const recipeCard = createRecipeCard(recipe);
                recipeGrid.appendChild(recipeCard);
            });
        } else {
            console.log("No recipes found in the index");
            recipeGrid.innerHTML = `
                <div class="message">
                    <h2>No Recipes Found</h2>
                    <p>Your recipe collection is empty.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recipes:', error);
        document.getElementById('recipe-grid').innerHTML = `
            <div class="error-message">
                <h2>Oops! Something went wrong</h2>
                <p>We couldn't load the recipes. Please try again later.</p>
                <p>Error: ${error.message}</p>
            </div>
        `;
    }
}

// Function to create a recipe card element
function createRecipeCard(recipeInfo) {
    console.log("Creating card for recipe:", recipeInfo.title);
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.setAttribute('data-recipe-id', recipeInfo.id);
    
    // Fix image path if it starts with /
    const imagePath = recipeInfo.thumbnail.startsWith('/') ? 
        recipeInfo.thumbnail.substring(1) : recipeInfo.thumbnail;
    
    card.innerHTML = `
        <img src="${imagePath}" alt="${recipeInfo.title}" class="recipe-thumbnail">
        <div class="recipe-info">
            <h2 class="recipe-title">${recipeInfo.title}</h2>
            <p class="recipe-meta">${recipeInfo.time || ''} · ${recipeInfo.difficulty || ''}</p>
        </div>
    `;
    
    // Add click event to navigate to the recipe viewer
    card.addEventListener('click', function() {
        window.location.href = `recipe-viewer.html?id=${recipeInfo.id}`;
    });
    
    return card;
}