// Offline food database (values per 100 g/ml unless added with S() which converts from a serving).
// Figures are rounded USDA-style averages - good enough for tracking, not for medical use.
import { uid } from './util.js';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const DB = [];
// P: per-100g values. serv = [[label, grams], ...] (first = default)
const P = (name, kcal, p, c, f, serv = [['100 g', 100]], cat = 'food') =>
  DB.push({ id: slug(name), name, kcal, p, c, f, serv: serv.map(([label, g]) => ({ label, g })), cat });
// S: per-serving values -> converted to per-100g
const S = (name, label, g, kcal, p, c, f, cat = 'meal') => {
  const k = 100 / g;
  DB.push({ id: slug(name), name, kcal: kcal * k, p: p * k, c: c * k, f: f * k, serv: [{ label, g }, { label: '100 g', g: 100 }], cat });
};

// ---- meat, fish, eggs, protein ----
P('Chicken breast, cooked', 165, 31, 0, 3.6, [['1 breast (150 g)', 150], ['100 g', 100]], 'protein');
P('Chicken breast, raw', 120, 22.5, 0, 2.6, [['1 breast (170 g)', 170], ['100 g', 100]], 'protein');
P('Chicken thigh, cooked (skinless)', 209, 26, 0, 10.9, [['1 thigh (110 g)', 110], ['100 g', 100]], 'protein');
P('Chicken wings, cooked', 290, 27, 0, 19.5, [['3 wings (100 g)', 100]], 'protein');
P('Turkey breast, cooked', 135, 30, 0, 0.7, [['1 serving (100 g)', 100]], 'protein');
P('Ground turkey 93% lean, cooked', 213, 27, 0, 11, [['1 serving (113 g)', 113]], 'protein');
P('Ground beef 90% lean, cooked', 217, 26, 0, 12, [['1 serving (113 g)', 113]], 'protein');
P('Ground beef 80% lean, cooked', 270, 26, 0, 18, [['1 serving (113 g)', 113]], 'protein');
P('Beef steak (sirloin), cooked', 210, 29, 0, 10, [['1 steak (170 g)', 170], ['100 g', 100]], 'protein');
P('Ribeye steak, cooked', 291, 24, 0, 21, [['1 steak (225 g)', 225], ['100 g', 100]], 'protein');
P('Pork chop, cooked', 231, 26, 0, 13, [['1 chop (130 g)', 130]], 'protein');
P('Pork tenderloin, cooked', 143, 26, 0, 3.5, [['1 serving (113 g)', 113]], 'protein');
P('Bacon, cooked', 541, 37, 1.4, 42, [['1 slice (8 g)', 8], ['3 slices (24 g)', 24]], 'protein');
P('Ham, sliced', 145, 21, 1.5, 5.5, [['2 slices (56 g)', 56]], 'protein');
P('Sausage, pork, cooked', 339, 19, 2, 28, [['1 link (45 g)', 45]], 'protein');
P('Salmon, cooked', 206, 22, 0, 12, [['1 fillet (150 g)', 150], ['100 g', 100]], 'protein');
P('Tuna, canned in water', 116, 26, 0, 1, [['1 can drained (120 g)', 120]], 'protein');
P('Cod, cooked', 105, 23, 0, 0.9, [['1 fillet (140 g)', 140]], 'protein');
P('Tilapia, cooked', 128, 26, 0, 2.7, [['1 fillet (115 g)', 115]], 'protein');
P('Shrimp, cooked', 99, 24, 0.2, 0.3, [['6 large (85 g)', 85]], 'protein');
P('Egg, whole', 143, 12.6, 0.7, 9.5, [['1 large egg (50 g)', 50], ['2 large eggs (100 g)', 100]], 'protein');
P('Egg white', 52, 10.9, 0.7, 0.2, [['1 large white (33 g)', 33], ['3 whites (99 g)', 99]], 'protein');
P('Tofu, firm', 144, 17, 3, 8.7, [['1/2 block (126 g)', 126], ['100 g', 100]], 'protein');
P('Tempeh', 192, 20, 7.6, 10.8, [['1 serving (85 g)', 85]], 'protein');
P('Seitan', 143, 25, 6, 2, [['1 serving (85 g)', 85]], 'protein');
P('Whey protein powder', 400, 80, 8, 6, [['1 scoop (30 g)', 30]], 'protein');
P('Plant protein powder', 390, 72, 10, 7, [['1 scoop (33 g)', 33]], 'protein');
S('Protein shake, ready to drink', '1 bottle (330 ml)', 330, 160, 30, 5, 3, 'protein');
S('Protein bar', '1 bar (60 g)', 60, 210, 20, 22, 7, 'snack');

// ---- dairy ----
P('Greek yogurt, nonfat plain', 59, 10.2, 3.6, 0.4, [['1 container (170 g)', 170], ['1 cup (245 g)', 245]], 'dairy');
P('Greek yogurt, whole milk', 97, 9, 4, 5, [['1 container (170 g)', 170]], 'dairy');
P('Yogurt, fruit (low-fat)', 85, 3.5, 15, 1.2, [['1 container (170 g)', 170]], 'dairy');
P('Skyr, plain', 63, 11, 4, 0.2, [['1 container (150 g)', 150]], 'dairy');
P('Cottage cheese, low fat', 81, 10.4, 4.8, 2.3, [['1/2 cup (113 g)', 113], ['1 cup (226 g)', 226]], 'dairy');
P('Milk, whole', 61, 3.2, 4.8, 3.3, [['1 cup (244 ml)', 244], ['1 glass (300 ml)', 300]], 'dairy');
P('Milk, 2%', 50, 3.3, 4.8, 2, [['1 cup (244 ml)', 244]], 'dairy');
P('Milk, skim', 34, 3.4, 5, 0.1, [['1 cup (245 ml)', 245]], 'dairy');
P('Soy milk, unsweetened', 33, 2.9, 1.5, 1.8, [['1 cup (240 ml)', 240]], 'dairy');
P('Oat milk', 46, 1, 6.7, 1.5, [['1 cup (240 ml)', 240]], 'dairy');
P('Almond milk, unsweetened', 15, 0.6, 0.3, 1.2, [['1 cup (240 ml)', 240]], 'dairy');
P('Cheddar cheese', 403, 25, 1.3, 33, [['1 slice (28 g)', 28], ['1/4 cup shredded (28 g)', 28]], 'dairy');
P('Mozzarella, part-skim', 254, 24, 2.8, 16, [['1 oz (28 g)', 28]], 'dairy');
P('Parmesan, grated', 431, 38, 4.1, 29, [['1 tbsp (5 g)', 5]], 'dairy');
P('Feta cheese', 264, 14, 4, 21, [['1 oz (28 g)', 28]], 'dairy');
P('Cream cheese', 342, 6, 4, 34, [['1 tbsp (15 g)', 15], ['2 tbsp (30 g)', 30]], 'dairy');
P('Butter', 717, 0.9, 0.1, 81, [['1 tbsp (14 g)', 14], ['1 tsp (5 g)', 5]], 'fat');
P('Heavy cream', 340, 2.8, 2.8, 36, [['1 tbsp (15 ml)', 15]], 'dairy');
P('Ice cream, vanilla', 207, 3.5, 23.6, 11, [['1/2 cup (66 g)', 66], ['1 scoop (100 g)', 100]], 'sweets');

// ---- grains & starches ----
P('White rice, cooked', 130, 2.7, 28.2, 0.3, [['1 cup (158 g)', 158], ['1/2 cup (79 g)', 79]], 'grain');
P('Brown rice, cooked', 123, 2.7, 25.6, 1, [['1 cup (195 g)', 195]], 'grain');
P('Basmati rice, cooked', 121, 3.5, 25, 0.4, [['1 cup (163 g)', 163]], 'grain');
P('Pasta, cooked', 158, 5.8, 30.9, 0.9, [['1 cup (140 g)', 140], ['2 cups (280 g)', 280]], 'grain');
P('Pasta, dry', 371, 13, 75, 1.5, [['2 oz dry (56 g)', 56], ['100 g', 100]], 'grain');
P('Quinoa, cooked', 120, 4.4, 21.3, 1.9, [['1 cup (185 g)', 185]], 'grain');
P('Couscous, cooked', 112, 3.8, 23.2, 0.2, [['1 cup (157 g)', 157]], 'grain');
P('Oats, rolled (dry)', 379, 13.2, 67.7, 6.5, [['1/2 cup (40 g)', 40], ['1 cup (80 g)', 80]], 'grain');
P('Oatmeal, cooked with water', 71, 2.5, 12, 1.5, [['1 cup (234 g)', 234]], 'grain');
P('Bread, whole wheat', 247, 13, 41, 3.4, [['1 slice (32 g)', 32], ['2 slices (64 g)', 64]], 'grain');
P('Bread, white', 266, 9, 49, 3.2, [['1 slice (28 g)', 28], ['2 slices (56 g)', 56]], 'grain');
P('Sourdough bread', 289, 12, 56, 1.8, [['1 slice (50 g)', 50]], 'grain');
P('Bagel, plain', 257, 10, 50, 1.6, [['1 bagel (105 g)', 105]], 'grain');
P('Tortilla, flour (8")', 310, 8, 51, 8, [['1 tortilla (45 g)', 45]], 'grain');
P('Tortilla, corn', 218, 5.7, 45, 2.9, [['1 tortilla (26 g)', 26]], 'grain');
P('Naan bread', 290, 9, 50, 6, [['1 piece (90 g)', 90]], 'grain');
P('Roti / chapati', 297, 9.5, 46, 8, [['1 medium (40 g)', 40]], 'grain');
P('Cereal, corn flakes', 357, 7.5, 84, 0.4, [['1 cup (30 g)', 30]], 'grain');
P('Granola', 471, 10, 64, 20, [['1/2 cup (60 g)', 60]], 'grain');
P('Rice cake', 387, 8, 82, 2.8, [['1 cake (9 g)', 9]], 'grain');
P('Potato, baked', 93, 2.5, 21, 0.1, [['1 medium (173 g)', 173]], 'grain');
P('Potato, boiled', 87, 1.9, 20, 0.1, [['1 medium (150 g)', 150]], 'grain');
P('Sweet potato, baked', 90, 2, 20.7, 0.2, [['1 medium (130 g)', 130]], 'grain');
P('French fries', 312, 3.4, 41, 15, [['1 medium serving (117 g)', 117], ['1 small (71 g)', 71]], 'grain');
P('Popcorn, air-popped', 387, 12.9, 77.8, 4.5, [['3 cups (24 g)', 24]], 'snack');
S('Pancake, plain', '1 pancake (38 g)', 38, 86, 2.4, 11, 3.7, 'grain');

// ---- fruit ----
P('Banana', 89, 1.1, 22.8, 0.3, [['1 medium (118 g)', 118], ['1 large (136 g)', 136]], 'fruit');
P('Apple', 52, 0.3, 13.8, 0.2, [['1 medium (182 g)', 182]], 'fruit');
P('Orange', 47, 0.9, 11.8, 0.1, [['1 medium (131 g)', 131]], 'fruit');
P('Strawberries', 32, 0.7, 7.7, 0.3, [['1 cup (152 g)', 152]], 'fruit');
P('Blueberries', 57, 0.7, 14.5, 0.3, [['1 cup (148 g)', 148], ['1/2 cup (74 g)', 74]], 'fruit');
P('Raspberries', 52, 1.2, 11.9, 0.7, [['1 cup (123 g)', 123]], 'fruit');
P('Grapes', 69, 0.7, 18.1, 0.2, [['1 cup (151 g)', 151]], 'fruit');
P('Watermelon', 30, 0.6, 7.6, 0.2, [['1 cup (152 g)', 152]], 'fruit');
P('Pineapple', 50, 0.5, 13.1, 0.1, [['1 cup (165 g)', 165]], 'fruit');
P('Mango', 60, 0.8, 15, 0.4, [['1 cup (165 g)', 165]], 'fruit');
P('Pear', 57, 0.4, 15.2, 0.1, [['1 medium (178 g)', 178]], 'fruit');
P('Peach', 39, 0.9, 9.5, 0.3, [['1 medium (150 g)', 150]], 'fruit');
P('Kiwi', 61, 1.1, 14.7, 0.5, [['1 kiwi (69 g)', 69]], 'fruit');
P('Avocado', 160, 2, 8.5, 14.7, [['1/2 avocado (100 g)', 100], ['1 avocado (200 g)', 200]], 'fruit');
P('Raisins', 299, 3.1, 79.2, 0.5, [['1 small box (43 g)', 43]], 'fruit');
P('Dates, medjool', 277, 1.8, 75, 0.2, [['1 date (24 g)', 24], ['3 dates (72 g)', 72]], 'fruit');

// ---- vegetables ----
P('Broccoli, cooked', 35, 2.4, 7.2, 0.4, [['1 cup (156 g)', 156]], 'veg');
P('Broccoli, raw', 34, 2.8, 6.6, 0.4, [['1 cup (91 g)', 91]], 'veg');
P('Spinach, raw', 23, 2.9, 3.6, 0.4, [['1 cup (30 g)', 30], ['2 cups (60 g)', 60]], 'veg');
P('Carrots, raw', 41, 0.9, 9.6, 0.2, [['1 medium (61 g)', 61]], 'veg');
P('Tomato', 18, 0.9, 3.9, 0.2, [['1 medium (123 g)', 123]], 'veg');
P('Cucumber', 15, 0.7, 3.6, 0.1, [['1/2 cucumber (150 g)', 150]], 'veg');
P('Bell pepper, red', 31, 1, 6, 0.3, [['1 medium (119 g)', 119]], 'veg');
P('Onion', 40, 1.1, 9.3, 0.1, [['1/2 medium (55 g)', 55]], 'veg');
P('Lettuce, romaine', 17, 1.2, 3.3, 0.3, [['2 cups (94 g)', 94]], 'veg');
P('Green beans, cooked', 35, 1.9, 7.9, 0.3, [['1 cup (125 g)', 125]], 'veg');
P('Mushrooms, white', 22, 3.1, 3.3, 0.3, [['1 cup (70 g)', 70]], 'veg');
P('Zucchini', 17, 1.2, 3.1, 0.3, [['1 medium (196 g)', 196]], 'veg');
P('Cauliflower, cooked', 23, 1.8, 4.1, 0.5, [['1 cup (124 g)', 124]], 'veg');
P('Peas, green, cooked', 84, 5.4, 15.6, 0.2, [['1/2 cup (80 g)', 80]], 'veg');
P('Corn, sweet, cooked', 96, 3.4, 21, 1.5, [['1 ear (90 g)', 90], ['1/2 cup (82 g)', 82]], 'veg');
P('Asparagus, cooked', 22, 2.4, 4.1, 0.2, [['6 spears (90 g)', 90]], 'veg');
P('Cabbage, raw', 25, 1.3, 5.8, 0.1, [['1 cup (89 g)', 89]], 'veg');
P('Kale, raw', 49, 4.3, 8.8, 0.9, [['1 cup (67 g)', 67]], 'veg');

// ---- legumes, nuts, seeds, oils ----
P('Black beans, cooked', 132, 8.9, 23.7, 0.5, [['1/2 cup (86 g)', 86], ['1 cup (172 g)', 172]], 'legume');
P('Chickpeas, cooked', 164, 8.9, 27.4, 2.6, [['1/2 cup (82 g)', 82], ['1 cup (164 g)', 164]], 'legume');
P('Lentils, cooked', 116, 9, 20, 0.4, [['1/2 cup (99 g)', 99], ['1 cup (198 g)', 198]], 'legume');
P('Kidney beans, cooked', 127, 8.7, 22.8, 0.5, [['1/2 cup (89 g)', 89]], 'legume');
P('Edamame', 121, 11.9, 8.9, 5.2, [['1 cup (155 g)', 155]], 'legume');
P('Hummus', 166, 7.9, 14.3, 9.6, [['2 tbsp (30 g)', 30], ['1/4 cup (60 g)', 60]], 'legume');
P('Almonds', 579, 21.2, 21.6, 49.9, [['1 oz (28 g)', 28], ['1/4 cup (36 g)', 36]], 'nuts');
P('Peanuts', 567, 25.8, 16.1, 49.2, [['1 oz (28 g)', 28]], 'nuts');
P('Walnuts', 654, 15.2, 13.7, 65.2, [['1 oz (28 g)', 28]], 'nuts');
P('Cashews', 553, 18.2, 30.2, 43.9, [['1 oz (28 g)', 28]], 'nuts');
P('Pistachios', 560, 20.2, 27.2, 45.3, [['1 oz (28 g)', 28]], 'nuts');
P('Peanut butter', 588, 25, 20, 50, [['1 tbsp (16 g)', 16], ['2 tbsp (32 g)', 32]], 'nuts');
P('Almond butter', 614, 21, 19, 56, [['1 tbsp (16 g)', 16], ['2 tbsp (32 g)', 32]], 'nuts');
P('Chia seeds', 486, 16.5, 42.1, 30.7, [['1 tbsp (12 g)', 12]], 'nuts');
P('Flaxseed, ground', 534, 18.3, 28.9, 42.2, [['1 tbsp (7 g)', 7]], 'nuts');
P('Olive oil', 884, 0, 0, 100, [['1 tbsp (13.5 g)', 13.5], ['1 tsp (4.5 g)', 4.5]], 'fat');
P('Coconut oil', 862, 0, 0, 100, [['1 tbsp (13.6 g)', 13.6]], 'fat');
P('Mayonnaise', 680, 1, 0.6, 75, [['1 tbsp (14 g)', 14]], 'fat');
P('Honey', 304, 0.3, 82.4, 0, [['1 tbsp (21 g)', 21]], 'sweets');
P('Sugar, white', 387, 0, 100, 0, [['1 tsp (4 g)', 4], ['1 tbsp (12.5 g)', 12.5]], 'sweets');
P('Maple syrup', 260, 0, 67, 0.1, [['1 tbsp (20 g)', 20], ['1/4 cup (80 g)', 80]], 'sweets');
P('Jam', 250, 0.4, 65, 0.1, [['1 tbsp (20 g)', 20]], 'sweets');
P('Ketchup', 101, 1, 27, 0.1, [['1 tbsp (17 g)', 17]], 'sauce');
P('Soy sauce', 53, 8, 4.9, 0.6, [['1 tbsp (16 g)', 16]], 'sauce');
P('Salsa', 36, 1.5, 7, 0.2, [['2 tbsp (32 g)', 32]], 'sauce');
P('Ranch dressing', 430, 1.2, 6, 45, [['2 tbsp (30 g)', 30]], 'sauce');

// ---- snacks & sweets ----
P('Dark chocolate (70-85%)', 598, 7.8, 45.9, 42.6, [['1 oz (28 g)', 28], ['2 squares (20 g)', 20]], 'sweets');
P('Milk chocolate', 535, 7.7, 59.4, 29.7, [['1 oz (28 g)', 28]], 'sweets');
P('Potato chips', 536, 7, 53, 35, [['1 oz (28 g)', 28], ['1 small bag (43 g)', 43]], 'snack');
P('Tortilla chips', 489, 7.5, 63, 23, [['1 oz (28 g)', 28]], 'snack');
P('Pretzels', 380, 9.5, 80, 3, [['1 oz (28 g)', 28]], 'snack');
P('Cookie, chocolate chip', 488, 5.9, 64, 24, [['1 cookie (30 g)', 30]], 'sweets');
S('Granola bar', '1 bar (24 g)', 24, 100, 1.5, 17, 3, 'snack');
S('Donut, glazed', '1 donut (60 g)', 60, 255, 3, 31, 14, 'sweets');
P('Croissant', 406, 8.2, 45.8, 21, [['1 medium (57 g)', 57]], 'grain');
S('Muffin, blueberry', '1 muffin (113 g)', 113, 380, 5, 56, 15, 'sweets');
S('Brownie', '1 square (56 g)', 56, 243, 3, 33, 12, 'sweets');
S('Cheesecake slice', '1 slice (125 g)', 125, 400, 7, 32, 28, 'sweets');

// ---- drinks ----
P('Coffee, black', 1, 0.1, 0, 0, [['1 cup (240 ml)', 240]], 'drink');
S('Latte (whole milk)', '1 medium (350 ml)', 350, 190, 10, 15, 7, 'drink');
S('Cappuccino', '1 medium (240 ml)', 240, 120, 6, 9, 6, 'drink');
P('Cola', 42, 0, 10.6, 0, [['1 can (355 ml)', 355], ['1 bottle (500 ml)', 500]], 'drink');
P('Diet soda', 0.4, 0, 0, 0, [['1 can (355 ml)', 355]], 'drink');
P('Orange juice', 45, 0.7, 10.4, 0.2, [['1 cup (248 ml)', 248]], 'drink');
P('Apple juice', 46, 0.1, 11.3, 0.1, [['1 cup (248 ml)', 248]], 'drink');
P('Sports drink', 26, 0, 6.5, 0, [['1 bottle (591 ml)', 591]], 'drink');
P('Energy drink', 45, 0, 11, 0, [['1 can (473 ml)', 473], ['1 small can (250 ml)', 250]], 'drink');
P('Beer, regular', 43, 0.5, 3.6, 0, [['1 can (355 ml)', 355], ['1 pint (473 ml)', 473]], 'drink');
P('Wine, red', 85, 0.1, 2.6, 0, [['1 glass (150 ml)', 150]], 'drink');
P('Vodka / whiskey (40%)', 231, 0, 0, 0, [['1 shot (44 ml)', 44]], 'drink');
P('Smoothie, fruit', 60, 0.6, 14, 0.3, [['1 medium (350 ml)', 350]], 'drink');

// ---- prepared meals & restaurant staples ----
S('Cheeseburger', '1 burger (119 g)', 119, 300, 15, 33, 13);
S('Big burger (double patty)', '1 burger (215 g)', 215, 550, 25, 45, 30);
S('Chicken sandwich, fried', '1 sandwich (200 g)', 200, 510, 28, 48, 23);
S('Pizza slice, cheese', '1 slice (107 g)', 107, 285, 12, 36, 10);
S('Pizza slice, pepperoni', '1 slice (113 g)', 113, 313, 13, 34, 14);
S('Chicken nuggets (6 pc)', '6 pieces (100 g)', 100, 280, 14, 17, 18);
S('Burrito, chicken & rice', '1 burrito (300 g)', 300, 600, 32, 70, 20);
S('Taco, beef (hard shell)', '1 taco (78 g)', 78, 170, 8, 13, 9);
S('Quesadilla, cheese & chicken', '1 quesadilla (200 g)', 200, 520, 28, 36, 28);
S('Sushi roll, California (6 pc)', '6 pieces (170 g)', 170, 255, 9, 38, 7);
S('Sushi, salmon nigiri', '2 pieces (70 g)', 70, 100, 7, 14, 2);
S('Caesar salad with chicken', '1 bowl (300 g)', 300, 440, 35, 15, 27);
S('Greek salad', '1 bowl (250 g)', 250, 250, 7, 14, 19);
S('Spaghetti with meat sauce', '1 plate (350 g)', 350, 525, 24, 63, 19);
S('Lasagna', '1 piece (250 g)', 250, 340, 20, 30, 15);
S('Mac and cheese', '1 cup (200 g)', 200, 380, 15, 40, 17);
S('Pad thai', '1 plate (300 g)', 300, 600, 20, 80, 22);
S('Fried rice', '1 cup (200 g)', 200, 330, 10, 50, 10);
S('Chicken curry with rice', '1 plate (400 g)', 400, 620, 35, 70, 21);
S('Dal (lentil curry)', '1 cup (240 g)', 240, 230, 12, 33, 6);
S('Chicken tikka masala', '1 cup (240 g)', 240, 340, 26, 14, 20);
S('Falafel', '3 pieces (51 g)', 51, 170, 7, 16, 9);
S('Gyoza / dumplings', '5 pieces (125 g)', 125, 250, 10, 30, 9);
S('Ramen, instant (cooked)', '1 pack (85 g dry)', 85, 380, 8, 54, 14);
S('Ramen bowl, restaurant', '1 bowl (550 g)', 550, 550, 25, 65, 20);
S('Turkey sandwich', '1 sandwich (200 g)', 200, 350, 24, 40, 9);
S('Peanut butter & jelly sandwich', '1 sandwich (100 g)', 100, 350, 12, 42, 16);
S('Grilled cheese sandwich', '1 sandwich (130 g)', 130, 400, 15, 28, 25);
S('Omelette (3 eggs, cheese)', '1 omelette (200 g)', 200, 400, 28, 3, 31, 'protein');
S('Scrambled eggs (2 eggs, butter)', '1 serving (120 g)', 120, 200, 13, 2, 15, 'protein');
S('Avocado toast', '1 slice + 1/2 avocado (150 g)', 150, 300, 7, 30, 17);
S('Pancakes with syrup (3)', '1 stack (250 g)', 250, 520, 8, 90, 14);
S('Overnight oats with fruit', '1 jar (300 g)', 300, 380, 14, 58, 9);
S('Chicken & rice bowl', '1 bowl (400 g)', 400, 560, 42, 65, 12);
S('Poke bowl, salmon', '1 bowl (400 g)', 400, 600, 33, 75, 18);
S('Tuna salad sandwich', '1 sandwich (180 g)', 180, 400, 23, 35, 19);
S('Kebab / shawarma wrap', '1 wrap (300 g)', 300, 560, 32, 52, 24);
S('Hot dog with bun', '1 hot dog (100 g)', 100, 290, 10, 24, 17);
S('Fish & chips', '1 plate (400 g)', 400, 850, 32, 80, 44);
S('Vegetable soup', '1 bowl (350 g)', 350, 120, 4, 22, 2);
S('Chicken noodle soup', '1 bowl (350 g)', 350, 150, 10, 18, 4);
S('Miso soup', '1 bowl (240 ml)', 240, 40, 3, 5, 1);

export const FOODS = DB;
export const FOOD_BY_ID = Object.fromEntries(DB.map((f) => [f.id, f]));

export function searchFoods(query, extra = [], limit = 40) {
  const tokens = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) return [];
  const scored = [];
  for (const f of [...extra, ...DB]) {
    const n = f.name.toLowerCase();
    let score = 0, ok = true;
    for (const t of tokens) {
      const i = n.indexOf(t);
      if (i < 0) { ok = false; break; }
      score += i === 0 ? 4 : n[i - 1] === ' ' || n[i - 1] === '(' ? 3 : 1;
    }
    if (!ok) continue;
    score -= n.length / 100;
    if (extra.includes(f)) score += 2;
    scored.push([score, f]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map((s) => s[1]);
}

const r1 = (n) => Math.round(n * 10) / 10;
/** Build a log entry (totals for qty x serving). `base` holds ONE serving so qty edits stay exact. */
export function entryFromFood(food, serving, qty = 1, meal = 'snack', src = 'db') {
  const sv = serving || food.serv?.[0] || { label: '100 g', g: 100 };
  const k = sv.g / 100;
  return {
    id: uid(), meal, name: food.name, unit: sv.label, qty, baseGrams: sv.g, src,
    base: { kcal: Math.round(food.kcal * k), p: r1(food.p * k), c: r1(food.c * k), f: r1(food.f * k) },
    t: Date.now(),
  };
}
export const entryTotals = (e) => ({
  kcal: Math.round(e.base.kcal * e.qty), p: r1(e.base.p * e.qty), c: r1(e.base.c * e.qty), f: r1(e.base.f * e.qty),
});

export const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch', label: 'Lunch', emoji: '🥗' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { id: 'snack', label: 'Snacks', emoji: '🍎' },
];
export const defaultMeal = () => { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack'; };
