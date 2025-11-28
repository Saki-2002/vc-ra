flag = True
mensaje = "Mensaje por defecto"

while flag:
    print("\n--- MENU ---")
    print("1 -> Setear mensaje")
    print("2 -> Imprimir mensaje seteado")
    print("3 -> Salir del manu")

    opcion = input("Elige una opcion: ")

    if opcion == "1":
        mensaje = input("Ingresa el nuevo mensaje: ")
        print("Mensaje actualizado.")
    
    elif opcion == "2":
        print(f"Mensaje actual: {mensaje}")
    
    elif opcion == "3":
        print("Saliendo del menu...")
        flag = False
    
    else:
        print("Opcion no válida. Intenta nuevamente.")
