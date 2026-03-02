
const ProductList = ({ products, addToCart }) => {
  // Raggruppa i prodotti per categoria
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category || 'Generico';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});

  return (
    <div className="mt-4">
      {Object.keys(groupedProducts).map(category => (
        <div key={category} className="mb-6">
          <h3 className="text-lg text-center font-semibold mb-2">{category}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {groupedProducts[category].map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col justify-center items-center p-2 rounded-xl text-white font-bold text-center shadow-md transition-transform transform hover:scale-105"
                style={{ backgroundColor: product.color || '#3b82f6' }}
              >
                <span className="break-words w-full">{product.name}</span>
                <span className="mt-1 text-sm">{product.price.toFixed(2)} €</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
