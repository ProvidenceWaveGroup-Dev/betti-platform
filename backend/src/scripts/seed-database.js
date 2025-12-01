// Seed database with data from JSON files
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, '../../data/betti.db')
const db = new Database(dbPath)

console.log('📦 Seeding database:', dbPath)

// Read the foods database JSON
const foodsJson = JSON.parse(readFileSync(join(__dirname, '../data/foods-database.json'), 'utf8'))

// Check if foods table is empty
const existingFoods = db.prepare('SELECT COUNT(*) as count FROM foods').get()
console.log('Existing foods in database:', existingFoods.count)

if (existingFoods.count === 0) {
  console.log('Seeding foods database...')

  const insertFood = db.prepare(`
    INSERT INTO foods (name, category, calories, protein, carbs, fat, fiber, serving_unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((foods) => {
    for (const food of foods) {
      insertFood.run(
        food.name,
        food.category || null,
        food.calories || 0,
        food.protein || 0,
        food.carbs || 0,
        food.fat || 0,
        food.fiber || 0,
        food.unit || 'serving'
      )
    }
  })

  insertMany(foodsJson.foods)
  console.log('Inserted', foodsJson.foods.length, 'foods')
} else {
  console.log('Foods table already has data, skipping seed')
}

// Read nutrition goals JSON
const nutritionJson = JSON.parse(readFileSync(join(__dirname, '../data/nutrition.json'), 'utf8'))

// Update nutrition goals
const goals = nutritionJson.nutritionGoals
console.log('\nUpdating nutrition goals:', goals)

db.prepare(`
  INSERT INTO nutrition_goals (user_id, calories, protein, carbs, fat, fiber, sodium, effective_date)
  VALUES (1, ?, ?, ?, ?, ?, ?, date('now'))
  ON CONFLICT(user_id, effective_date) DO UPDATE SET
    calories = excluded.calories,
    protein = excluded.protein,
    carbs = excluded.carbs,
    fat = excluded.fat,
    fiber = excluded.fiber,
    sodium = excluded.sodium
`).run(goals.calories, goals.protein, goals.carbs, goals.fat, goals.fiber, goals.sodium)

console.log('Nutrition goals updated')

// Verify
const finalFoodCount = db.prepare('SELECT COUNT(*) as count FROM foods').get()
const finalGoals = db.prepare('SELECT * FROM nutrition_goals WHERE user_id = 1 ORDER BY effective_date DESC LIMIT 1').get()

console.log('\n=== Final State ===')
console.log('Foods in database:', finalFoodCount.count)
console.log('Current goals:', finalGoals)

db.close()
console.log('\n✅ Seed complete!')
