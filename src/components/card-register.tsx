'use client';

import { useState } from "react"; // Importamos useState
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react"; // Importamos Eye y EyeOff
import { registerUser } from "@/app/api/auth/me/auth.api"; // Asegúrate que la ruta de importación sea correcta
import { useLoginDialog } from '@/contexts/LoginDialogContext'; // Importar el hook del contexto

// 1. Definimos el esquema de validación con Zod
const registerSchema = z.object({
  firstName: z.string().min(1, { message: "El nombre es requerido." }),
  lastName: z.string().min(1, { message: "El apellido es requerido." }),
  email: z.string().email({ message: "Debe ser un email válido." }),
  phone: z.string().min(1, { message: "El teléfono es requerido." }),
  address: z.string().min(1, { message: "La dirección es requerida." }),
  username: z.string().min(3, { message: "El usuario debe tener al menos 3 caracteres." }),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
});

// Derivamos el tipo de los datos del formulario a partir del esquema
type RegisterFormData = z.infer<typeof registerSchema>;

export function CardRegister() {
  const router = useRouter();
  const { openLoginDialog } = useLoginDialog(); // Usamos la función para abrir el diálogo del contexto
  const [showPassword, setShowPassword] = useState(false); // Nuevo estado para la visibilidad de la contraseña

  // 2. Configuramos react-hook-form para usar nuestro esquema de Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // 3. La función onSubmit ahora recibe los datos validados
  const handleRegister = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      toast.success("¡Registro exitoso!", {
        description: "Serás redirigido para iniciar sesión.",
      });
      // Abre el diálogo de login a través del contexto
      openLoginDialog();
      // Redirige a la página principal o donde se renderiza UserDropdown
      router.push("/");
    } catch (err: any) {
      toast.error("Error en el registro", {
        description: err.message || "Por favor, verifica tus datos e inténtalo de nuevo.",
      });
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Crea tu cuenta</CardTitle>
        <CardDescription>Ingresa tus datos para registrarte.</CardDescription>
      </CardHeader>
      {/* 4. Usamos el handleSubmit de react-hook-form */}
      <form onSubmit={handleSubmit(handleRegister)}>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 5. Conectamos cada input con el hook usando 'register' y mostramos los errores */}
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre</Label>
            <Input id="firstName" placeholder="John" {...register("firstName")} />
            {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido</Label>
            <Input id="lastName" placeholder="Doe" {...register("lastName")} />
            {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="tu@email.com" {...register("email")} />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" type="tel" placeholder="123-456-7890" {...register("phone")} />
            {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de Usuario</Label>
            <Input id="username" placeholder="johndoe" {...register("username")} />
            {errors.username && <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="123 Calle Principal" {...register("address")} />
            {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative"> {/* Contenedor para el input y el icono */}
              <Input
                id="password"
                type={showPassword ? "text" : "password"} // Cambia el tipo según el estado
                {...register("password")}
                className="pr-10" // Añade padding a la derecha para el icono
              />
              <button
                type="button" // Importante: para que no envíe el formulario
                onClick={() => setShowPassword(prev => !prev)} // Alterna la visibilidad
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                tabIndex={-1} // CAMBIO: Elimina el botón del orden de tabulación
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {isSubmitting ? "Registrando..." : "Registrarse"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
