
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:5000/api'

function App() {
  const [foods, setFoods] = useState([])
  const [cart, setCart] = useState({})
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/foods`)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load the menu')
        return response.json()
      })
      .then(setFoods)
      .catch(() => setError('Unable to load food. Check the Flask API and MongoDB.'))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['All', ...new Set(foods.map((food) => food.category))]

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      const matchesCategory = category === 'All' || food.category === category
      const matchesSearch = food.name.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [foods, category, search])

  const cartItems = foods
    .filter((food) => cart[food.id] > 0)
    .map((food) => ({ ...food, quantity: cart[food.id] }))

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  function changeQuantity(foodId, amount) {
    setCart((current) => {
      const nextQuantity = (current[foodId] || 0) + amount
      const updated = { ...current }

      if (nextQuantity <= 0) {
        delete updated[foodId]
      } else {
        updated[foodId] = nextQuantity
      }

      return updated
    })
    setMessage('')
  }

  async function placeOrder() {
    if (cartItems.length === 0) return

    setPlacingOrder(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            foodId: item.id,
            quantity: item.quantity,
          })),
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Order failed')

      setMessage(
        `Order placed successfully! Order ID: ${result.orderId}. Total: ₹${result.total}`,
      )
      setCart({})
    } catch (err) {
      setError(err.message || 'Could not place your order.')
    } finally {
      setPlacingOrder(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#home">🍽️ QuickBite</a>
        <a className="cart-link" href="#cart">
          🛒 Cart ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
        </a>
      </header>

      <main id="home">
        <section className="hero">
          <p className="eyebrow">FRESH • TASTY • DELIVERED</p>
          <h1>Good food, good mood.</h1>
          <p>Choose your favourites and place your order.</p>
          <input
            className="search"
            type="search"
            placeholder="Search food..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </section>

        {error && <p className="notice error">{error}</p>}
        {message && <p className="notice success">{message}</p>}

        <section className="menu-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OUR MENU</p>
              <h2>Explore the food</h2>
            </div>
          </div>

          <div className="categories">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? 'category active' : 'category'}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {loading ? (
            <p>Loading menu...</p>
          ) : filteredFoods.length === 0 ? (
            <p>No food items found.</p>
          ) : (
            <div className="food-grid">
              {filteredFoods.map((food) => (
                <article className="food-card" key={food.id}>
                  <div className="food-emoji">{food.emoji}</div>
                  <div className="food-info">
                    <span className="food-category">{food.category}</span>
                    <h3>{food.name}</h3>
                    <p>{food.description}</p>
                    <div className="food-bottom">
                      <strong>₹{food.price}</strong>
                      <button
                        className="add-button"
                        onClick={() => changeQuantity(food.id, 1)}
                      >
                        + Add
                      </button>
                    </div>
                    {cart[food.id] > 0 && (
                      <div className="quantity">
                        <button onClick={() => changeQuantity(food.id, -1)}>
                          −
                        </button>
                        <span>{cart[food.id]}</span>
                        <button onClick={() => changeQuantity(food.id, 1)}>
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="cart" className="cart-section">
          <h2>Your cart</h2>

          {cartItems.length === 0 ? (
            <p>Your cart is empty. Add something delicious!</p>
          ) : (
            <>
              {cartItems.map((item) => (
                <div className="cart-item" key={item.id}>
                  <span>{item.emoji} {item.name} × {item.quantity}</span>
                  <strong>₹{item.price * item.quantity}</strong>
                </div>
              ))}

              <div className="cart-total">
                <span>Total</span>
                <strong>₹{total}</strong>
              </div>

              <button
                className="order-button"
                onClick={placeOrder}
                disabled={placingOrder}
              >
                {placingOrder ? 'Placing order...' : 'Place Order'}
              </button>
            </>
          )}
        </section>
      </main>

      <footer>QuickBite · Simple food ordering demo</footer>
    </div>
  )
}

export default App
