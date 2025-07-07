"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registerUser } from "@/app/api/auth/me/auth.api";


export function CardRegister() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await registerUser(formData);
      toast.success("¡Registro exitoso!", {
        description: "Serás redirigido para iniciar sesión.",
      });
      router.push("/");
    } catch (err: any) {
      toast.error("Error en el registro", {
        description: err.message || "Por favor, verifica tus datos e inténtalo de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Crea tu cuenta</CardTitle>
        <CardDescription>Ingresa tus datos para registrarte.</CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre</Label>
            <Input id="firstName" placeholder="John" required value={formData.firstName} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido</Label>
            <Input id="lastName" placeholder="Doe" required value={formData.lastName} onChange={handleInputChange} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="tu@email.com" required value={formData.email} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" type="tel" placeholder="123-456-7890" required value={formData.phone} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de Usuario</Label>
            <Input id="username" placeholder="johndoe" required value={formData.username} onChange={handleInputChange} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="123 Calle Principal" required value={formData.address} onChange={handleInputChange} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required value={formData.password} onChange={handleInputChange} />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {isLoading ? "Registrando..." : "Registrarse"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => router.back()} disabled={isLoading}>
            Cancelar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}