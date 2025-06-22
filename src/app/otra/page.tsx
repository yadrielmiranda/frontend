import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub, // Importa para submenús si los necesitas
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import { Bell } from "lucide-react";

function TopBar() {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-red-800 dark:text-gray-50">
          Impact +
        </h1>
      </div>

      {/* Navegación (visible en desktop, oculto en mobile o gestionado por Sheet) */}
      <nav className="hidden md:flex gap-6">
        {/* DropdownMenu para Proyectos */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">Proyectos</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Gestión de Proyectos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Todos los Proyectos</DropdownMenuItem>
            <DropdownMenuItem>Proyectos Activos</DropdownMenuItem>
            <DropdownMenuItem>Crear Nuevo Proyecto</DropdownMenuItem>
            {/* Ejemplo de un submenú dentro de Proyectos */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Archivados</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Proyectos de 2023</DropdownMenuItem>
                <DropdownMenuItem>Proyectos de 2022</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botón original sin cambiar (Ejemplo: Tareas) */}
        <Button variant="ghost">Tareas</Button>

        {/* Botón original sin cambiar (Ejemplo: Equipos) */}
        <Button variant="ghost">Equipos</Button>

        {/* DropdownMenu para Informes */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">Settings</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="text-red-500">
              Ver si ponemos algo aqui
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/brands">Brands</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/products">Products</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/products">Systems</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/framecolors">Frame Colors</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/products">Coating</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/products">Cristals</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/products">Tints</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Tiempo Registrado</DropdownMenuItem>
            <DropdownMenuItem>Cargas de Trabajo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Acciones y Perfil de Usuario */}
      <div className="flex items-center gap-4">
        {/* Barra de Búsqueda */}
        <Input placeholder="Buscar..." className="hidden md:block w-48" />

        {/* Botón de Notificaciones */}
        <Button variant="ghost" size="icon" className="relative">
          {/* Icono de campana (ej. de Lucide React o similar) */}
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            0
          </span>
        </Button>

        {/* Dropdown del Perfil de Usuario (ya estaba como DropdownMenu) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt="@shadcn" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">John Doe</p>
                <p className="text-xs leading-none text-muted-foreground">
                  john.doe@example.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mi Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configuración</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Cerrar Sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Menú Hamburguesa para Responsive */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                ☰ {/* Icono de hamburguesa */}
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Navegación</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {/* Puedes replicar los DropdownMenus aquí para el menú móvil */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start">
                      Proyectos
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem>Todos los Proyectos</DropdownMenuItem>
                    <DropdownMenuItem>Proyectos Activos</DropdownMenuItem>
                    <DropdownMenuItem>Crear Nuevo Proyecto</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" className="w-full justify-start">
                  Tareas
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Equipos
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start">
                      Settings
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem asChild>
                      <Link href="/products">Products</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/products">Systems</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/framecolors">Frame Colors</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/products">Coating</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/products">Cristals</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/products">Tints</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>Tiempo Registrado</DropdownMenuItem>
                    <DropdownMenuItem>Cargas de Trabajo</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Puedes añadir un Input de búsqueda aquí también para móvil */}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
