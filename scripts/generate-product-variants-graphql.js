// Requires
const config = require('../config.json');
const fs = require('fs');

// Constants
const outFolder = `${__dirname}/out`;
const outFile = 'generate-product-variants';

// Variables
let args = '';
let muts = '';
let vars = {};

// Main
(async function() {
  for (let i = 1; i <= config.variantCount; i++) {
    const eol = i < config.variantCount ? '\n' : '';
    const price = (config.variantPriceStart + config.variantPriceStep * i).toFixed(2);
    args += `    $productVariantInput${i}: ProductVariantInput!,${eol}`;
    muts += `    productVariantCreate${i}: productVariantCreate(input: $productVariantInput${i}) {product{id}}${eol}`;
    vars[`productVariantInput${i}`] = {
      productId: `gid://shopify/Product/${config.productId}`,
      options: [`Custom $${price} plate`],
      price,
    }
  }

  // Create out folder if not exists
  if (!fs.existsSync(outFolder)){
    fs.mkdirSync(outFolder);
  }

  // Create and/or edit the GraphQL file
  fs.writeFileSync(`${outFolder}/${outFile}.graphql`, `
mutation createProductVariants(
${args}
) {
${muts}
}
  `);

  // Create and/or edit the GraphQL variables file
  fs.writeFileSync(`${outFolder}/${outFile}.json`, JSON.stringify(vars, null, 2));
})();