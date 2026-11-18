"use client";
import { useEffect } from "react";
import { cartStore } from "./cart-store";

/** Pedido pago: esvazia o carrinho deste aparelho. */
export function ClearCartOnPaid() {
  useEffect(() => {
    cartStore.dispatch({ type: "clear" });
  }, []);
  return null;
}
