export function checkDeveloperPassword(inputPassword: string): boolean {
  const developerPassword = 'sua_senha_aqui'; // Substitua por uma senha segura
  return inputPassword === developerPassword;
}