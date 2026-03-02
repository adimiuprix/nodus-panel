<?php
$phpVersion = phpversion();
$serverName = $_SERVER['SERVER_NAME'];
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome - Nodus Panel</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #0f0f1a;
            --card: #161625;
            --accent: #6366f1;
            --text: #e8e8f0;
            --text-dim: #9a9ab5;
            --border: #2a2a45;
        }

        body {
            margin: 0;
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .welcome-card {
            background: var(--card);
            padding: 45px 60px;
            border-radius: 20px;
            border: 1px solid var(--border);
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            position: relative;
            overflow: hidden;
        }

        /* Subtle glow effect top */
        .welcome-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--accent), transparent);
        }

        .icon-box {
            width: 64px;
            height: 64px;
            background: rgba(99, 102, 241, 0.1);
            color: var(--accent);
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin: 0 auto 24px;
        }

        h1 {
            margin: 0 0 8px;
            font-size: 28px;
            font-weight: 700;
        }

        p {
            color: var(--text-dim);
            margin: 0 0 32px;
            font-size: 15px;
        }

        .php-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: var(--bg);
            padding: 10px 20px;
            border-radius: 100px;
            border: 1px solid var(--border);
            font-size: 14px;
        }

        .php-badge i {
            color: #8993be;
            /* PHP Color */
        }

        .php-badge b {
            color: var(--accent);
        }

        footer {
            margin-top: 40px;
            font-size: 12px;
            color: var(--text-dim);
            opacity: 0.6;
        }
    </style>
</head>

<body>
    <div class="welcome-card">
        <div class="icon-box">
            <i class="fas fa-rocket"></i>
        </div>
        <h1>Welcome to Nodus Panel</h1>
        <p>Your development domain <b><?php echo $serverName; ?></b> is ready for takeoff.</p>

        <div class="php-badge">
            <i class="fab fa-php"></i>
            <span>PHP Version: <b><?php echo $phpVersion; ?></b></span>
        </div>

        <footer>
            &copy; <?php echo date('Y'); ?> Nodus Panel &bull; Local Environment
        </footer>
    </div>
</body>

</html>