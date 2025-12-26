import { getAuth, signInWithEmailAndPassword} from "firebase/auth";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDE3zIAOPODFvvh09mYkOqCUZ_5uViGQwg",
  authDomain: "perequeteavalia.firebaseapp.com",
  projectId: "perequeteavalia",
  storageBucket: "perequeteavalia.appspot.com",
  messagingSenderId: "197548664110",
  appId: "1:197548664110:web:0a124799bfd92045c206bf",
  measurementId: "G-4MVQMEQ2SH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const loginService = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const role = typeof userData.role === 'object' ? userData.role.role : userData.role;

      return {
        success: true,
        user: userCredential.user,
        role: role,
        userData: userData,
      };
    } else {
      throw new Error('Usuário não encontrado no Firestore');
    }
  } catch (error) {
    console.error('Erro no login:', error.message);
    return { success: false, message: error.message };
  }
};

export const logoutService = async () => {
  try {
    await auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return { success: false, message: error.message };
  }
};