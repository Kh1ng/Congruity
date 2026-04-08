// import { useAuth } from "../Components/AuthContext";

// const loginHelper = async (email, password) => {
//   try {
//     const response = await fetch("/api/login", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ email, password }),
//   });

//   if (response.ok) {
//     useAuth(response.json());
//   } else {
//     const errorData = await response.json();
//     throw new Error("Log in failed ", errorData.message);
//   }
// } catch (err) {
//   throw new Error("An error occurred.", err);
// };

// export default loginHelper;
