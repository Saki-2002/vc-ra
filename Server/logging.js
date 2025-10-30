import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let inConsole = false

// Crear carpeta logs si no existe
const logsDir = path.join(__dirname, 'logs')
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir)
}

// ⭐ Variable global para el nivel de indentación
let indentLevel = 0
const INDENT_CHAR = '  ' // 2 espacios por nivel

// Nombre del archivo con fecha
const getLogFileName = () => {
    const now = new Date()
    const date = now.toISOString().split('T')[0] // YYYY-MM-DD
    return path.join(logsDir, `server-${date}.log`)
}

/*
// Función para formatear timestamp
const getTimestamp = () => {
    return new Date().toISOString().replace('T', ' ').substring(0, 23)
}
*/

// ⭐ RESETEAR el archivo al iniciar el servidor
// En lugar de initializeLogFile(), usa:
const initializeLogFile = () => {
    const logFile = getLogFileName()
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 23)
    const startMessage = `${'='.repeat(80)}\n[${timestamp}] SERVIDOR INICIADO\n${'='.repeat(80)}\n`
    
    // ⭐ Sobrescribir (no append) para resetear completamente
    fs.writeFileSync(logFile, startMessage, 'utf8')
}

// ⭐ Llamar al inicio para resetear/inicializar
initializeLogFile()

// ⭐ Obtener la indentación actual
const getIndent = () => {
    return INDENT_CHAR.repeat(indentLevel)
}

// Función principal de logging
export const log = (message, level = '') => {
    //const timestamp = getTimestamp()
    const indent = getIndent()
    //const logMessage = `[${timestamp}] [${level}] ${indent}${message}\n`
    const logMessage = `${indent}[${level}] ${message}\n`

    // Escribir en archivo
    fs.appendFileSync(getLogFileName(), logMessage, 'utf8')
    
    // También mostrar en consola
    if(inConsole) console.log(logMessage.trim())
}

// Atajos para diferentes niveles
export const logInfo = (message) => log(message, 'INFO')
export const logError = (message) => log(message, 'ERROR')
export const logWarn = (message) => log(message, 'WARN')
export const logDebug = (message) => log(message, 'DEBUG')



//
//
//
export const logFunc = (message) => {
    log(`Ingreso a función [${message}]`)
    indent()
}
export const logList = (message) => {
    log(`Listener [${message}] activado`)
    indent()
}
export const logObj = (obj) => log(`${JSON.stringify(obj, null, (indentLevel + 2))}`)
export const logEnd = (message) => {
    log(`[${message}]`)
    unindent()
}
export const logErr = (message) => {
    log(`[ERROR] ${message}`)
    unindent()
}

export const logMap = (key, object) => {
    log(`Key: ${key}`)
    logObj(object)
}

export const logInConsole = (bool) => {
    inConsole = bool
}





//
//
//




// Para objetos
export const logObject = (obj, label = 'Object', level = 'INFO') => {
    const message = `${label}: ${JSON.stringify(obj, null, 2)}`
    log(message, level)
}

// ⭐ Aumentar nivel de indentación
export const indent = () => {
    indentLevel++
}

// ⭐ Disminuir nivel de indentación
export const unindent = () => {
    if (indentLevel > 0) {
        indentLevel--
    }
}

// ⭐ Resetear indentación (útil para debugging)
export const resetIndent = () => {
    indentLevel = 0
}

// ⭐ Obtener nivel actual (útil para debugging)
export const getIndentLevel = () => {
    return indentLevel
}