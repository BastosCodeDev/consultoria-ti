-- Modelo da base de dados: Consultoria TI
-- Executar no MySQL Workbench ou phpMyAdmin (XAMPP).

CREATE DATABASE IF NOT EXISTS consultoria_ti
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE consultoria_ti;

-- Utilizadores (clientes e administradores). A senha NUNCA é guardada em claro.
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,           -- hash bcrypt
  role          ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- Catálogo de serviços (CRUD na área /admin)
CREATE TABLE IF NOT EXISTS services (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- preço "a partir de"
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Pedidos de orçamento: um cliente pede um orçamento sobre um serviço
CREATE TABLE IF NOT EXISTS quotes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  message    TEXT NOT NULL,
  status     ENUM('pendente','em_analise','respondido') NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_quotes_user (user_id),
  KEY idx_quotes_service (service_id),
  CONSTRAINT fk_quotes_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_quotes_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Registo de acessos (login, logout e tentativas falhadas), com data e hora
CREATE TABLE IF NOT EXISTS access_logs (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NULL,                  -- NULL se o email não existe
  email      VARCHAR(150) NOT NULL,
  event      ENUM('login','logout','login_falhado') NOT NULL,
  ip         VARCHAR(45) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_logs_created (created_at),
  CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Serviços iniciais (edite à vontade ou gira tudo pelo /admin)
INSERT INTO services (name, description, price)
SELECT * FROM (
  SELECT 'Auditoria de Segurança da Informação' AS name,
         'Análise de vulnerabilidades em redes, servidores e aplicações, com relatório de riscos e plano de correção.' AS description,
         4500.00 AS price
  UNION ALL SELECT 'Desenvolvimento de Aplicações Web',
         'Sites e sistemas web sob medida, com front-end responsivo, back-end seguro e base de dados.', 8000.00
  UNION ALL SELECT 'Infraestrutura e Redes',
         'Projeto, instalação e manutenção de redes, servidores e backups para pequenas e médias empresas.', 3200.00
  UNION ALL SELECT 'Cloud e Migração de Sistemas',
         'Migração de sistemas locais para a nuvem, com planeamento, testes e controlo de custos.', 6000.00
  UNION ALL SELECT 'Suporte Técnico e Gestão de TI',
         'Contrato mensal de suporte, monitorização e gestão do parque informático da sua empresa.', 1800.00
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM services);
