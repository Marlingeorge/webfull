import { useState } from "react";

function LoginForm() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motdepasse, setMotdepasse] = useState("");

  const envoyer = async (e) => {
    e.preventDefault();

    const data = {
      nom,
      email,
      motdepasse,
    };

    const response = await fetch("http://localhost:5000/ajouter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const resultat = await response.text();

    alert(resultat);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form
        onSubmit={envoyer}
        className="bg-white p-8 rounded-xl shadow-lg w-96"
      >
        <h1 className="text-2xl font-bold mb-5 text-center">
          Formulaire
        </h1>

        <input
          type="text"
          placeholder="Nom"
          className="w-full border p-3 mb-4 rounded"
          onChange={(e) => setNom(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-3 mb-4 rounded"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full border p-3 mb-4 rounded"
          onChange={(e) => setMotdepasse(e.target.value)}
        />

        <button
          type="submit"
          className="bg-blue-500 text-white w-full p-3 rounded"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}

export default LoginForm;