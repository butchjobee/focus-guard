// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-analytics.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDVMVLMpV-IWJ8oKJKbYJ1KclvI-qYtF-M",
    authDomain: "focus-guard-f3a04.firebaseapp.com",
    projectId: "focus-guard-f3a04",
    storageBucket: "focus-guard-f3a04.firebasestorage.app",
    messagingSenderId: "15130254463",
    appId: "1:15130254463:web:35d53aa005ef7fb59ef34a",
    measurementId: "G-SW8KV4096S"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Export initialized services
export { app, db, auth, analytics };