# Nuvem (Cloud Vault) no Axion

## Objetivo

A Nuvem é um módulo de documentos pessoais, separado da senha principal do Axion. Ela deve funcionar como um cofre exclusivo, com autenticação própria, criptografia obrigatória e cache local protegido.

## Regras principais

- todos os arquivos são criptografados antes de serem armazenados
- nenhum arquivo pode existir em texto puro
- nomes, pastas e metadados sensíveis também são protegidos
- o acesso offline somente acontece em cache cifrado
- a descriptografia ocorre somente em memória, durante a sessão desbloqueada
- ao bloquear o cofre, a chave em memória é descartada

## Camadas de segurança

### 1. Senha do cofre

A senha da Nuvem é independente da senha do Axion.

- mínimo 12 caracteres
- bloqueio após inatividade configurável
- tentativa limitada por política progressiva
- sem persistência em logs
- sem vínculo com login principal

### 2. Derivação de chave

No navegador, usamos PBKDF2 para derivar a chave da senha do cofre.

Padrão recomendado:
- PBKDF2-HMAC-SHA256
- 250.000 iterações
- salt aleatório por vault

Isso produz a chave da senha que desbloqueia a chave mestre do cofre.

### 3. Chave mestre do vault

A chave mestre do cofre é gerada em memória e protegida por AES-GCM.

### 4. Arquivos

Cada arquivo recebe:
- uma chave aleatória AES-256
- um nonce aleatório
- criptografia AES-GCM do conteúdo
- a chave do arquivo protegida pela chave mestre do vault

### 5. Nomes, metadados e pastas

O sistema também deve cifrar:
- nomes de arquivos
- nomes de pastas
- tipos MIME
- qualquer metadado sensível

### 6. Cache offline

O cache local em IndexedDB guarda somente:
- blobs cifrados
- metadados cifrados
- chaves protegidas

Nunca deve guardar:
- senha em localStorage
- chave em sessionStorage
- arquivos em texto puro
- previews persistidas em disco

## Web Crypto API

A aplicação usa Web Crypto API do navegador.

Recomendado:
- AES-GCM para criptografia de arquivos
- PBKDF2 para derivação da senha
- chave mestre em memória durante a sessão

## IndexedDB

Os stores sugeridos são:
- vault
- folders
- files
- blobs

## Armazenamento remoto

Para armazenamento em Supabase:
- usar bucket dedicado, como `cloud-docs`
- subir blobs cifrados
- usar políticas RLS por usuário autenticado

## Fluxo recomendado

1. Usuário abre /nuvem
2. app verifica se há vault local
3. se existir, pede a senha exclusiva da Nuvem
4. derivação da chave da senha
5. descriptografar a chave mestre do vault
6. carregar folders e arquivos locais
7. permitir acesso somente enquanto a sessão estiver ativa
8. ao bloquear, limpar memória e remover preview

## Regras que devem ser sempre respeitadas

- sem opção de desativar criptografia
- sem upload em texto puro
- sem fallback para armazenamento em claro
- sem salvar senha em logs
- sem exportar sem confirmação
- sem preview persistente em disco
- sem backup em texto puro

Essa arquitetura mantém a Nuvem como um cofre digital privado, alinhado ao modelo do Axion e compatível com o padrão da aplicação atual.
