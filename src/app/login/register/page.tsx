"use client";

import { useState } from "react"; // <-- Importa useState
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createUser } from "@/app/api/users.api";

// Asume que tu archivo users.api.ts está en una ruta como:
// - lib/api/users.api.ts
// - services/users.api.ts
// Ajusta esta ruta según la ubicación real de tu archivo.
 // <-- Importa tu función createUser

export default function CardRegister() {
  const router = useRouter();

  // --- Estados para cada campo del formulario ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // --- Estados para manejar la UI ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault(); // Previene la recarga de la página

    setIsLoading(true); // Activa el estado de carga
    setError(null); // Resetea cualquier error previo

    try {
      const user = {
        firstName,
        lastName,
        email,
        phone,
        address,
        username,
        password,
        admin: false
      };

      // --- Llama a tu función createUser ---
      const response = await createUser(user);

      // console.log("Usuario registrado con éxito:", response);
      alert("¡Registration successful! Redirecting to login..."); // Puedes usar un Toast de Shadcn en lugar de alert

      // Redirige al usuario a la página de login o a un dashboard
      router.push("/"); // <-- Cambia '/login' a la ruta deseada después del registro

    } catch (err: any) { // Captura y maneja errores de la API
      console.error("Error al registrar el usuario:", err);
      // Muestra un mensaje de error al usuario
      setError(err.message || "Account registration failed. Please try again.");
    } finally {
      setIsLoading(false); // Desactiva el estado de carga, sin importar el resultado
    }
  };

  const handleCancelClick = () => {
    router.back();
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Enter your details to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="firstname">Name</Label>
              <Input
                id="firstname"
                type="text"
                placeholder="Enter your first name"
                required
                value={firstName} // <-- Vincula el valor al estado
                onChange={(e) => setFirstName(e.target.value)} // <-- Actualiza el estado al cambiar
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastname">Last Name</Label>
              <Input
                id="lastname"
                type="text"
                placeholder="Enter your last name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                placeholder="Enter your address"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Muestra un mensaje de error si existe */}
          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

          <CardFooter className="flex-col gap-2 pt-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading} // <-- Deshabilita el botón mientras carga
            >
              {isLoading ? (
                // Puedes usar un spinner aquí, o el mismo icono UserPlus girando
                <span className="flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registrando...
                </span>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancelClick}
              disabled={isLoading} // <-- También deshabilita el botón de cancelar
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
