import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';

import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  async function addProduct (productId: number) {
    try {
      const response = await api.get(`products/${productId}`)
      
      const stockResponse = await api.get<Stock>(`stock/${productId}`)

      const newProduct = {
        ...response.data,
        amount: 1
      }

      const existentCartProduct = cart.find(product => product.id === productId)
      const validateStockQuantity = existentCartProduct && stockResponse.data.amount < (existentCartProduct.amount + 1 && newProduct.amount)

      if(validateStockQuantity) {
        throw new Error('Quantidade solicitada fora de estoque')
      }
      
      if(response.status === 404) {
        throw new Error('Erro na adição do produto')
      }

      if(existentCartProduct) {
        updateProductAmount({
          productId,
          amount: existentCartProduct.amount + 1
        })
      }

      if(!existentCartProduct) {
        setCart([...cart, newProduct])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, newProduct]))
      }
    } catch(err) {

      toast.error('Erro na adição do produto')
    }
  };

  function removeProduct(productId: number) {
    try {
      const findProduct = cart.find(product => product.id === productId)
      
      if(!findProduct) {
        throw new Error('Erro na remoção do produto')
      }

      const productsUpdated = cart.filter(product => product.id !== productId)

      setCart(productsUpdated)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsUpdated))
    } catch(err) {
      toast.error(err.message)
    }
  };

  async function updateProductAmount({
    productId,
    amount,
  }: UpdateProductAmount) {
    try {
      const findProduct = cart.find(product => product.id === productId)
      
      if(!findProduct) {
        throw new Error('Erro na alteração de quantidade do produto')
      }

      if(amount <= 0) {
        return
      }

      const stockResponse = await api.get(`stock/${productId}`)

      const validateStockQuantity = stockResponse.data.amount < amount
      
      if(validateStockQuantity) {
        throw new Error('Quantidade solicitada fora de estoque')
      }

      const productsUpdated = cart.map(product => {
        if(product.id === productId) {
          return {
            ...product,
            amount
          }
        }

        return product
      })
      
      setCart(productsUpdated)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsUpdated))
    } catch(err) {
      toast.error(err.message)
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
