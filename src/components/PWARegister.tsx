"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        console.log(
          "Alteract PWA : Service Worker enregistré",
          registration.scope
        );
      } catch (error) {
        console.error(
          "Alteract PWA : erreur Service Worker",
          error
        );
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}