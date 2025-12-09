import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

export const app = initializeApp({
  apiKey: "AIzaSyBBt77mpu6TV0IA2tcNSyf4OltsVu_Z1Zw",
  authDomain: "cf3-integration-tests-v2-qa.firebaseapp.com",
  databaseURL: "https://cf3-integration-tests-v2-qa-default-rtdb.firebaseio.com",
  projectId: "cf3-integration-tests-v2-qa",
  storageBucket: "cf3-integration-tests-v2-qa.firebasestorage.app",
  messagingSenderId: "576826020291",
  appId: "1:576826020291:web:488d568c5d4109df12ed76",
});

export const auth = getAuth(app);
export const functions = getFunctions(app);
