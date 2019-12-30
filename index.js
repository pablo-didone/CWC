// Variables
let config;
let selectedQuantityOption;
let selectedIngredientsQuantity = 0;
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

const driveImagesUrl = 'https://drive.google.com/uc?export=view&id=';
const minSelectedIngredients = 3;
const maxSelectedIngredients = 5;
const productsUrl = 'https://cookinwithcorey.com/admin/api/2019-10/products.json';

// Main
(async function() {
  config = await (await fetch('config.json')).json();
  
  createPriceBar();
  await loadIngredients();
  await initMealBox();
  renderQuantityButtons(config.ingredients_configuration[0].ingredients_quantity);
})();

// Functions
function renderQuantityButtons(ingredients_quantity) {
  if (selectedQuantityOption && selectedQuantityOption.ingredients_quantity === ingredients_quantity) {
  	return false;
  }
  resetIngredients();

  selectedQuantityOption = config.ingredients_configuration.find(c => c.ingredients_quantity === ingredients_quantity);

  $sizeSelection = $('#size-selection')[0];

  while($sizeSelection.lastChild) {
  	$sizeSelection.removeChild($sizeSelection.lastChild);
  }

  config.ingredients_configuration.forEach(c => {
    $(`<button
		 class="${c.ingredients_quantity === ingredients_quantity && 'selected'}"
		 onclick="renderQuantityButtons(${c.ingredients_quantity})"
	   >
         <p class="ingredients-quantity">${c.ingredients_quantity} Ingredients</p>
         <p class="size-description">Max ${c.max_protein} protein</p>
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
	  <p class="description">${item.name}</p>
	  <p class="weight">${item.portion}g</p>
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
}

function getIngredientImageUrl(url) {
  const matches = url.match(/^https:\/\/drive.google.com\/open\?id\=([\w-]+)/);
  const src = matches && matches[1] ?
    `${driveImagesUrl}${matches[1]}` :
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

  ingredients = normalizeIngredients(ingredients);

  const categories = ingredients
    .map(i => i.category)
    .filter((c, i, s) => i === s.indexOf(c));

  let data = {};

  categories.forEach(c => {
    data[c] = [];
  });

  ingredients.forEach(i => data[i.category].push(i));

  console.log(data)

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

  if (selectedIngredient.quantity + quantity < 0 ||
     selectedIngredientsQuantity + quantity > selectedQuantityOption.ingredients_quantity) {
  	return false;
  }

  if (selectedIngredient.category === 'Main'&&
      (selectedProteinQuantity + quantity <= selectedQuantityOption.max_protein)) {
  	selectedProteinQuantity += quantity;
  } else if (selectedIngredient.category === 'Main'&&
            (selectedProteinQuantity + quantity > selectedQuantityOption.max_protein)) {
    alert(`Only ${selectedQuantityOption.max_protein} protein allowed`);
    return false;
  }

  selectedIngredient.quantity += quantity;
  selectedIngredientsQuantity += quantity;

  for (m in macros) {
    macros[m] = macros[m] + quantity * selectedIngredient[m];
  }

  setMacros();
  createUpdateItem(selectedIngredient);
}

function calculate() {
  // Calculates meal box price depending on ingredients prices
  $action = $('.bottom-bar .action')[0];

  if (totalPrice === 0) {
    selectedVariant = null;
    $($action).prop('disabled', true);
    return false;
  }

  if (selectedIngredients.length < minSelectedIngredients) {
  	$($action).prop('disabled', true);
  } else {
  	$($action).prop('disabled', false);
  }

  selectedVariant = variants.find(v => v.price >= totalPrice) || variants[variants.length - 1];
}

function initMealBox() {
  getVariants();
  setMacros();
  $('.bottom-bar .price')[0].innerHTML = '$ ' + totalPrice;
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
      i.picture = i.picture || `${driveImagesUrl}1nAue3Eohej_kQAYrBWCm2gKMEGaF6WgA`;
      i.category = i.category.trim().replace(lineBreakRegEx, '');
      i.name = i.name.trim().replace(lineBreakRegEx, '');
      i.picture = i.picture.replace(lineBreakRegEx, '').trim();

      return i;
  	});
}

function createPriceBar() {
  window.location.pathname === '/pages/customize' &&
  $(`
	<div class="bottom-bar">
      <div class="price"></div>
      <div class="macros"></div>
      <button class="action" onclick="void()" disabled>add dishes</button>
    </div>
  `).appendTo($('body'));
}

async function addToCart() {
  const cartUrl = 'https://nacho-test.myshopify.com/cart/add.js';
  let properties = {};

  selectedIngredients.forEach(i => {
    const name = $(i).data('props').name;
    const portion = $(i).data('props').portion;
    properties[name] = portion + 'g';
  });

  await fetch(cartUrl, {
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

async function getVariants() {

  	variants = [
      {
        id: 31633731158109,
        price: "1.00"
      },
    {
  id: 31633731158109,
  price: "1.00"
},
{
  id: 31633731158109,
  price: "2.00"
},
{
  id: 31633731158109,
  price: "3.00"
},
{
  id: 31633731158109,
  price: "4.00"
},
{
  id: 31633731158109,
  price: "5.00"
},
{
  id: 31633731158109,
  price: "6.00"
},
{
  id: 31633731158109,
  price: "7.00"
},
{
  id: 31633731158109,
  price: "8.00"
},
{
  id: 31633731158109,
  price: "9.00"
},
{
  id: 31633731158109,
  price: "10.00"
},
{
  id: 31633731158109,
  price: "11.00"
},
{
  id: 31633731158109,
  price: "12.00"
},
{
  id: 31633731158109,
  price: "13.00"
},
{
  id: 31633731158109,
  price: "14.00"
},
{
  id: 31633731158109,
  price: "15.00"
},
{
  id: 31633731158109,
  price: "16.00"
},
{
  id: 31633731158109,
  price: "17.00"
},
{
  id: 31633731158109,
  price: "18.00"
},
{
  id: 31633731158109,
  price: "19.00"
},
{
  id: 31633731158109,
  price: "20.00"
},
{
  id: 31633731158109,
  price: "21.00"
},
{
  id: 31633731158109,
  price: "22.00"
},
{
  id: 31633731158109,
  price: "23.00"
},
{
  id: 31633731158109,
  price: "24.00"
},
{
  id: 31633731158109,
  price: "25.00"
},
{
  id: 31633731158109,
  price: "26.00"
},
{
  id: 31633731158109,
  price: "27.00"
},
{
  id: 31633731158109,
  price: "28.00"
},
{
  id: 31633731158109,
  price: "29.00"
},
{
  id: 31633731158109,
  price: "30.00"
},
  ]
//   variants = (await (await fetch(productsUrl))
//   	.json())
//     .products
//     .find(p => p.id === config.productId)
//     .variants;
}
