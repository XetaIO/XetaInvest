<?php

declare(strict_types=1);

namespace App\Enums;

enum AiChatRole: string
{
    case System = 'system';
    case User = 'user';
    case Assistant = 'assistant';
    case Tool = 'tool';
}
