const CATALOG_DATA = [
  // Format: [name, category, price, calories, protein_g, is_veg]
  ["Phulka", "Bread", 9, 80, 2.5, 1],
  ["Plain Naan", "Bread", 20, 260, 7.0, 1],
  ["Butter Naan", "Bread", 25, 310, 8.0, 1],
  ["White Rice", "Staple", 33, 260, 4.0, 1],
  ["Curd", "Side", 10, 60, 3.0, 1],
  ["Masala Dosai", "Tiffin", 38, 280, 5.0, 1],
  ["Onion Dosai", "Tiffin", 38, 250, 4.5, 1],
  ["Ghee Roast", "Tiffin", 55, 340, 5.0, 1],
  ["Idly With Ckn Curry", "Tiffin", 60, 320, 14.0, 0],
  ["Dahi Vada", "Tiffin", 40, 180, 5.0, 1],
  ["Full Boil (2 Eggs)", "Egg", 22, 140, 12.0, 0],
  ["Omlet", "Egg", 33, 155, 10.0, 0],
  ["Mutter Panneer", "Veg Gravy", 60, 360, 12.0, 1],
  ["Panneer Chat Pata", "Veg Gravy", 82, 420, 14.0, 1],
  ["Kolhapuri Paneer", "Veg Gravy", 82, 430, 14.0, 1],
  ["Chilli Panneer", "Chinese", 80, 390, 13.0, 1],
  ["Veg Burger", "Fast Food", 65, 350, 8.0, 1],
  ["Veg Biriyani", "Rice", 65, 380, 7.0, 1],
  ["Chicken Fried Rice", "Chinese", 93, 580, 22.0, 0],
  ["Panjabi Chicken", "Non-Veg Gravy", 109, 380, 28.0, 0],
  ["Rogan Chicken", "Non-Veg Gravy", 109, 390, 27.0, 0],
  ["Shahi Chicken", "Non-Veg Gravy", 109, 410, 26.0, 0],
  ["Chicken Masala Curry", "Non-Veg Gravy", 109, 380, 28.0, 0],
  ["Chicken Cheese Burger", "Fast Food", 70, 440, 21.0, 0],
  ["Chicken Briyani", "Biriyani", 120, 650, 30.0, 0],
  ["Deshi Ckn Biriyani", "Biriyani", 152, 720, 34.0, 0],
  ["Vankoli Biriyani (Turkey)", "Biriyani", 160, 710, 36.0, 0],
  ["Mutton Biriyani", "Biriyani", 174, 780, 32.0, 0],
  ["Tandoori Chicken", "Tandoor", 120, 360, 42.0, 0],
  ["Chicken Tikka", "Tandoor", 120, 340, 38.0, 0],
  ["Fish Fry", "Tandoor", 120, 310, 28.0, 0],
  ["Rambo Chicken", "Tandoor", 120, 390, 36.0, 0],
  ["Watermelon Juice", "Beverage", 40, 90, 1.0, 1],
  ["Mojito", "Beverage", 40, 110, 0.0, 1],
  ["Muskmelon Juice", "Beverage", 40, 95, 1.0, 1],
  ["Pineapple Juice", "Beverage", 44, 120, 0.5, 1],
  ["Grape Juice", "Beverage", 44, 130, 0.8, 1],
  ["Milkshake (Any Flavor)", "Beverage", 71, 290, 6.0, 1],
  ["Waffle", "Dessert", 60, 310, 5.0, 1]
];

function parseCatalogItem(item) {
  const [name, category, price, calories, protein_g, is_veg] = item;
  let dietType = "Non-Veg";
  if (category.toLowerCase() === "egg" || name.toLowerCase().includes("egg") || name.toLowerCase().includes("omlet")) {
    dietType = "Egg";
  } else if (is_veg === 1) {
    dietType = "Veg";
  }

  const protCal = protein_g * 4;
  const remCal = Math.max(0, calories - protCal);
  const carbsG = Number(((remCal * 0.65) / 4).toFixed(1));
  const fatG = Number(((remCal * 0.35) / 9).toFixed(1));

  return {
    name,
    category,
    dietType,
    costCredits: Number(price),
    calories: Number(calories),
    proteinG: Number(protein_g),
    carbsG,
    fatG,
    isAvailable: true,
    isFavourite: false
  };
}

module.exports = {
  CATALOG_DATA,
  parseCatalogItem
};
