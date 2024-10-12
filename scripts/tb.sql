# for usdt market making program
CREATE TABLE `tb_order_fbg001` (
  `id` int NOT NULL AUTO_INCREMENT,
  `symbol` varchar(20) NOT NULL DEFAULT '',
  `side` varchar(5) NOT NULL DEFAULT '',
  `quantity` int NOT NULL DEFAULT '0',
  `amount` float NOT NULL DEFAULT '0',
  `price` float NOT NULL DEFAULT '0',
  `notional` float NOT NULL DEFAULT '0',
  `maker` tinyint(1) NULL DEFAULT 1,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE EVENT IF NOT EXISTS `clear_orders_bb-daphne1`
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY)
DO
  DELETE FROM `tb_order_fbg001` WHERE create_time < NOW() - INTERVAL 7 DAY;


SELECT 
    EVENT_NAME, 
    EVENT_DEFINITION
FROM 
    information_schema.EVENTS 
WHERE 
    EVENT_SCHEMA = 'db_mm';

DROP EVENT IF EXISTS clear_coin_orders_btech001;


# for coin market making program
CREATE TABLE `tb_cmm_order_btech001` (
  `id` int NOT NULL AUTO_INCREMENT,
  `symbol` varchar(20) NOT NULL DEFAULT '',
  `side` varchar(5) NOT NULL DEFAULT '',
  `quantity` int NOT NULL DEFAULT '0',
  `amount` float NOT NULL DEFAULT '0',
  `price` float NOT NULL DEFAULT '0',
  `notional` float NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE EVENT IF NOT EXISTS clear_cmm_orders_btech001
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY)
DO
  DELETE FROM tb_cmm_order_btech001 WHERE create_time < NOW() - INTERVAL 7 DAY;

  CREATE TABLE `tb_cmm_balance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account` varchar(20) NOT NULL DEFAULT '',
  `data` json NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_create_time` (`account`, `create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `tb_cmm_margin_ratio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account` varchar(20) NOT NULL DEFAULT '',
  `data` json NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_create_time` (`account`, `create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `tb_cmm_pnl` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account` varchar(20) NOT NULL DEFAULT '',
  `data` json NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_create_time` (`account`, `create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `tb_cmm_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account` varchar(20) NOT NULL DEFAULT '',
  `btc_eth_delta` float NOT NULL DEFAULT '0',
  `other_delta` float NOT NULL DEFAULT '0',
  `total_delta` float NOT NULL DEFAULT '0',
  `orders_num` int NOT NULL DEFAULT '0',
  `position_count` int NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_create_time` (`account`, `create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=1819840 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `tb_cmm_order_btech001` (
  `id` int NOT NULL AUTO_INCREMENT,
  `symbol` varchar(20) NOT NULL DEFAULT '',
  `side` varchar(5) NOT NULL DEFAULT '',
  `quantity` int NOT NULL DEFAULT '0',
  `amount` float NOT NULL DEFAULT '0',
  `price` float NOT NULL DEFAULT '0',
  `notional` float NOT NULL DEFAULT '0',
  `maker` tinyint(1) NULL DEFAULT 1,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci


WITH first_last AS (
    SELECT 
        create_time,
        data,
        ROW_NUMBER() OVER (ORDER BY create_time) AS rn_first,
        ROW_NUMBER() OVER (ORDER BY create_time DESC) AS rn_last
    FROM 
        tb_cmm_balance
    WHERE 
        account = '$account' AND create_time BETWEEN $__timeFrom() AND $__timeTo()
),
first_data AS (
    SELECT 
        JSON_UNQUOTE(data) AS data
    FROM 
        first_last
    WHERE 
        rn_first = 1
),
last_data AS (
    SELECT 
        JSON_UNQUOTE(data) AS data
    FROM 
        first_last
    WHERE 
        rn_last = 1
)
SELECT 
    JSON_EXTRACT(last_data.data, '$.BTC') - JSON_EXTRACT(first_data.data, '$.BTC') AS btc_change,
    JSON_EXTRACT(last_data.data, '$.ETH') - JSON_EXTRACT(first_data.data, '$.ETH') AS eth_change
FROM 
    first_data,
    last_data;