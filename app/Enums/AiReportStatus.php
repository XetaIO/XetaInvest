<?php

namespace App\Enums;

enum AiReportStatus: string
{
    case Pending = 'pending';
    case Success = 'success';
    case Failed = 'failed';
}
