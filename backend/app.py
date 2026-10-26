
import os
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId

app = Flask(__name__)
CORS(app)

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
db = client["food_ordering"]

food_collection = db["foods"]
orders_collection = db["orders"]


def serialize_food(food):
    return {
        "id": str(food["_id"]),
        "name": food["name"],
        "description": food["description"],
        "price": food["price"],
        "category": food["category"],
        "emoji": food.get("emoji", "🍽️"),
    }


@app.get("/api/health")
def health():
    try:
        client.admin.command("ping")
        return jsonify({"status": "ok", "database": "connected"})
    except Exception:
        return jsonify({"status": "error", "database": "disconnected"}), 503


@app.get("/api/foods")
def get_foods():
    foods = list(food_collection.find().sort("name", 1))

    if not foods:
        sample_foods = [
            {
                "name": "Classic Burger",
                "description": "Juicy burger with fresh vegetables",
                "price": 149,
                "category": "Burgers",
                "emoji": "🍔",
            },
            {
                "name": "Margherita Pizza",
                "description": "Cheese, tomato and Italian herbs",
                "price": 249,
                "category": "Pizza",
                "emoji": "🍕",
            },
            {
                "name": "Veg Noodles",
                "description": "Noodles tossed with fresh vegetables",
                "price": 129,
                "category": "Noodles",
                "emoji": "🍜",
            },
            {
                "name": "French Fries",
                "description": "Crispy golden potato fries",
                "price": 89,
                "category": "Sides",
                "emoji": "🍟",
            },
        ]
        food_collection.insert_many(sample_foods)
        foods = list(food_collection.find().sort("name", 1))

    return jsonify([serialize_food(food) for food in foods])


@app.post("/api/orders")
def place_order():
    data = request.get_json(silent=True) or {}
    items = data.get("items", [])

    if not isinstance(items, list) or not items:
        return jsonify({"error": "Your cart is empty"}), 400

    order_items = []
    total = 0

    for item in items:
        if not isinstance(item, dict):
            return jsonify({"error": "Invalid cart item"}), 400

        try:
            food_id = ObjectId(item.get("foodId", ""))
            quantity = int(item.get("quantity", 0))
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid food ID or quantity"}), 400

        if quantity < 1 or quantity > 99:
            return jsonify({"error": "Quantity must be between 1 and 99"}), 400

        food = food_collection.find_one({"_id": food_id})
        if not food:
            return jsonify({"error": "Food item not found"}), 404

        order_items.append({
            "foodId": str(food["_id"]),
            "name": food["name"],
            "price": food["price"],
            "quantity": quantity,
        })
        total += food["price"] * quantity

    order = {
        "items": order_items,
        "total": total,
        "status": "placed",
        "createdAt": datetime.now(timezone.utc),
    }

    result = orders_collection.insert_one(order)

    return jsonify({
        "message": "Order placed successfully",
        "orderId": str(result.inserted_id),
        "total": total,
        "status": "placed",
    }), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
