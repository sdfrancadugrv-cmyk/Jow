import { developerPassword } from './authConfig';

export function verifyPassword(inputPassword: string): boolean {
    return inputPassword === developerPassword;
}

export function updatePassword(newPassword: string): void {
    // Aqui você pode implementar a lógica para atualizar a senha, se necessário
}