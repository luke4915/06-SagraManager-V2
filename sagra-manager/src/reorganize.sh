#!/bin/bash
# Esegui dalla cartella sagra-manager/src

# Pages
mkdir -p pages
cp components/Login.jsx pages/LoginPage.jsx
cp components/KDS.jsx pages/KDSPage.jsx
cp components/MenuPage.jsx pages/MenuPage.jsx

# Layout
mkdir -p components/layout
mv components/Header.jsx components/layout/Header.jsx
mv components/Sidebar.jsx components/layout/Sidebar.jsx
mv components/ErrorBoundary.jsx components/layout/ErrorBoundary.jsx

# Cart
mkdir -p components/cart/desktop components/cart/mobile
mv components/Cart.jsx components/cart/Cart.jsx
mv components/CartDesktopView.jsx components/cart/desktop/CartDesktopView.jsx
mv components/CartMobileView.jsx components/cart/mobile/CartMobileView.jsx

# Kitchen
mkdir -p components/kitchen/desktop components/kitchen/mobile
mv components/OrdersKitchen.jsx components/kitchen/OrdersKitchen.jsx

# Products
mkdir -p components/products/desktop components/products/mobile
mv components/ProductList.jsx components/products/ProductList.jsx
mv components/ProductConfig.jsx components/products/ProductConfig.jsx
mv components/ProductForm.jsx components/products/ProductForm.jsx

# Setup
mkdir -p components/setup
mv components/AppearanceSettings.jsx components/setup/AppearanceSettings.jsx
mv components/OrderSettings.jsx components/setup/OrderSettings.jsx
mv components/PrintProfiles.jsx components/setup/PrintProfiles.jsx
mv components/MenuSettings.jsx components/setup/MenuSettings.jsx

# Shared
mkdir -p components/shared
mv components/Toast.jsx components/shared/Toast.jsx
mv components/UserProfile.jsx components/shared/UserProfile.jsx
mv components/ChangePassword.jsx components/shared/ChangePassword.jsx
mv components/ReverseOrder.jsx components/shared/ReverseOrder.jsx
mv components/Statistics.jsx components/shared/Statistics.jsx

echo "✅ Struttura creata. Ora aggiorna gli import!"