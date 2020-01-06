// Variables
let selectedQuantityOption;
let selectedIngredientsQuantity = 0;
let selectedSauceSeasoningQuantity = 0;
let selectedProteinQuantity = 0;
let variants = [];
let selectedVariant = null;
let totalPrice = 0;
let ingredients = [];
let macros = {
  carbs: 0,
  fat: 0,
  protein: 0,
  cal: 0
};

// Functions
function renderQuantityButtons(newIngredientsQuantity) {
  if (selectedQuantityOption) {
    if (newIngredientsQuantity === selectedQuantityOption.ingredientsQuantity) {
      return false;
    }

    if (newIngredientsQuantity < selectedQuantityOption.ingredientsQuantity) {
      resetIngredients();
    }
  }

  selectedQuantityOption = config.restrictions.find(c => c.ingredientsQuantity === newIngredientsQuantity);

  $sizeSelection = $('#size-selection')[0];

  while($sizeSelection.lastChild) {
  	$sizeSelection.removeChild($sizeSelection.lastChild);
  }

  config.restrictions.forEach(c => {
    $(`<button
		 class="${newIngredientsQuantity === c.ingredientsQuantity && 'selected'}"
		 onclick="renderQuantityButtons(${c.ingredientsQuantity})"
	   >
		 <p class="label">${c.label}</p>
         <p class="size-description">
           ${c.ingredientsQuantity} ingredients
           (${c.maxProtein} protein${c.maxProtein > 1 ? 's' : ''} max)
         </p>
		 <p class="size-description">${config.maxSauceSeasoningQuantity} sauce or 1 seasoning</p>
      </button>`).appendTo($sizeSelection);
  });
}

function createCategory(title, category) {
  $ingredients = $('<div class="ingredients-container"></div>')[0];
  category.forEach(item => $ingredients.appendChild(createUpdateItem(item)));

  $category = $(`
	<div class="category">
	  <div class="title-bar">${title}</div>
	</div>
  `).appendTo($('#ingredients-list'));

  $category[0].appendChild($ingredients);
}

function createUpdateItem(item) {
  let $item = $(`#item-${item.id}`)[0];

  if ($item) {
  	$($item).find('.selected-quantity')[0].innerHTML = item.quantity;
    if (item.quantity > 0) {
   	  $($item).addClass('selected');
    } else {
      $($item).removeClass('selected');
    }
    return true;
  }

  $item = $(`
	<div class="item" id="item-${item.id}">
      <div class="image" style="background-image: url(${getIngredientImageUrl(item.picture)})"></div>
	  <div class="description-container">
        <p class="description">${item.name}</p>
	    <p class="weight">${item.portion}g</p>
      </div>
	  <div class="quantity-selector">
		<button onclick="changeIngredientQuantity(${item.id}, -1)"><i class="material-icons">remove</i></button>
		<span class="selected-quantity">${item.quantity}</span>
		<button onclick="changeIngredientQuantity(${item.id}, 1)"><i class="material-icons">add</i></button>
	  </div>
	</div>`);

  return $item[0];
}

function resetIngredients() {
  selectedIngredientsQuantity = 0;
  selectedProteinQuantity = 0;
  totalPrice = 0;
  selectedSauceSeasoningQuantity = 0;

  ingredients.forEach(i => i.quantity = 0);

  $items = $('.item');

  for (i = 0; i < $items.length; i++) {
    $($items[i]).removeClass('selected');
  	$($items[i]).find('.selected-quantity')[0].innerHTML = 0;
  }

  for (m in macros) {
    macros[m] = 0;
  }

  setMacros();
  calculate();
}

function getIngredientImageUrl(url) {
  const matches = url.match(/^https:\/\/drive.google.com\/open\?id=([\w-]+)/);
  const src = matches && matches[1] ?
    `${config.driveImagesUrl}${matches[1]}` :
  	url;

  return src;
}

async function loadIngredients() {
  const response = await fetch("https://docs.google.com/spreadsheets/d/1YAusxUp-nSuiR6K0bXAyug3Miq-xexC33XOvCf0ACoA/gviz/tq?tqx=out:csv&sheet=Sheet1");
  const text = await response.text();
  const textArray = text.split("\n");
  const props = textArray.shift().split(",").map(prop => prop.substring(1, prop.length - 1));

  textArray.forEach(textLine => {
    const textLineArray = textLine.split(",").map(prop => prop.substring(1, prop.length - 1));
    let ingredient = {};
    textLineArray.forEach((value, index) => ingredient[props[index].toLowerCase()] = value);
    ingredients.push(ingredient);
  });

  if (!ingredients.length) {
  	return false;
  }

  ingredients = normalizeIngredients(ingredients);

  const categories = ingredients
    .map(i => i.category)
    .filter((c, i, s) => i === s.indexOf(c));

  let data = {};

  categories.forEach(c => {
    data[c] = [];
  });

  ingredients.forEach(i => data[i.category].push(i));

  Object.keys(data).forEach(e => {
    createCategory(e, data[e]);
  });
}

function setMacros() {
  const $macros = $('.macros')[0];

  while ($macros.lastChild) {
    $macros.removeChild($macros.lastChild);
  }

  for (m in macros) {
    $('<span>' + m +': <span class="macros-value">' + macros[m] + '</span></span>').appendTo($macros);
  }
}

function changeIngredientQuantity(ingredientId, quantity) {
  selectedIngredient = ingredients.find(i => i.id === ingredientId);

  const isProtein = selectedIngredient.category === 'Protein';
  const isSauceOrSeasoning = (selectedIngredient.category === 'Sauce' || selectedIngredient.category === 'Seasoning');

  if (selectedIngredientsQuantity + quantity > selectedQuantityOption.ingredientsQuantity && !isSauceOrSeasoning) {
    alert(`Max ${selectedQuantityOption.ingredientsQuantity} ingredients in ${selectedQuantityOption.label} size`);
  	return false;
  }

  if (selectedIngredient.quantity + quantity < 0) {
  	return false;
  }

  if (isProtein && selectedProteinQuantity + quantity <= selectedQuantityOption.maxProtein) {
  	selectedProteinQuantity += quantity;
  } else if (isProtein && selectedProteinQuantity + quantity > selectedQuantityOption.maxProtein) {
    alert(`Only ${selectedQuantityOption.maxProtein} protein${selectedQuantityOption.maxProtein > 1 ? 's' : ''} allowed in ${selectedQuantityOption.label} size`);
    return false;
  } else if (isSauceOrSeasoning && selectedSauceSeasoningQuantity + quantity <= config.maxSauceSeasoningQuantity) {
  	selectedSauceSeasoningQuantity += quantity;
  } else if (isSauceOrSeasoning && selectedSauceSeasoningQuantity + quantity > config.maxSauceSeasoningQuantity) {
    alert(`You can choose either ${config.maxSauceSeasoningQuantity} Sauce or ${config.maxSauceSeasoningQuantity} Seasoning`)
    return false;
  }

  if (!isSauceOrSeasoning) {
  	selectedIngredientsQuantity += quantity;
  }

  selectedIngredient.quantity += quantity;
  totalPrice += +selectedIngredient.price * quantity;

  for (m in macros) {
    macros[m] = macros[m] + quantity * selectedIngredient[m];
  }

  setMacros();
  createUpdateItem(selectedIngredient);
  calculate();
}

function calculate() {
  // Calculates meal box price depending on ingredients prices
  $action = $('.bottom-bar .action')[0];

  if (totalPrice === 0) {
    selectedVariant = null;
    $($action).prop('disabled', true);
    $('.bottom-bar .price')[0].innerHTML = '$ 0.00';

    return false;
  }

  if (selectedIngredientsQuantity < selectedQuantityOption.ingredientsQuantity) {
  	$($action).prop('disabled', true);
  } else {
  	$($action).prop('disabled', false);
  }

  selectedVariant = variants.find(v => v.price >= totalPrice) || variants[variants.length - 1];

  $('.bottom-bar .price')[0].innerHTML = '$ ' + selectedVariant.price.toFixed(2);
}

function normalizeIngredients(ingredients) {
  const lineBreakRegEx = '/^\s+|\s+$/g';

  return ingredients
  	.filter(i => i.category && i.price && i.name)
  	.map((i, index) => {
      i.quantity = 0;
      i.id = index;
  	  i.fat = i.fat || 0;
      i.protein = i.protein || 0;
      i.carbs = i.carbs || 0;
      i.cal = i.cal || 0;
      i.portion = i.portion || 0;
      i.picture = i.picture || `${config.driveImagesUrl}1nAue3Eohej_kQAYrBWCm2gKMEGaF6WgA`;
      i.category = i.category.trim().replace(lineBreakRegEx, '');
      i.name = i.name.trim().replace(lineBreakRegEx, '');
      i.picture = i.picture.replace(lineBreakRegEx, '').trim();

      return i;
  	});
}

function createPriceBar() {
  $(`
	<div class="bottom-bar">
      <div class="price">$ 0.00</div>
      <div class="macros"></div>
      <button class="action" onclick="addToCart()" disabled>add dishes</button>
    </div>
  `).appendTo($('body'));
}

async function addToCart() {
  let properties = {};

  properties['DEMO'] = 'THIS IS A DEMO!!';
  properties['Size'] = selectedQuantityOption.label;

  selectedIngredients = ingredients
  	.filter(i => i.quantity > 0)
  	.forEach(i => {
      properties[i.name] = `${i.quantity * i.portion}g`;
  	});

  await fetch(config.cartUrl, {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: selectedVariant.id,
      quantity: 1,
      properties
    })
  });

  window.location.href = window.location.origin + '/cart';
}

function loadVariants() {
  config.productHandles.forEach(async handle => {
    const resp = await fetch(`/products/${handle}.js`);
    const product = await resp.json();
    variants = variants.concat(product.variants.map(({id, price}) => ({id, price: price / 100})));
    variants = variants.sort((a, b) => a.price - b.price);
  });
}

(async function() {
  window.location.pathname === '/pages/customize' &&
    createPriceBar();
    await loadIngredients();
    loadVariants();
    setMacros();
    renderQuantityButtons(config.restrictions[0].ingredientsQuantity);
})();