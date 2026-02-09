import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ErrorMessageProps {
    title?: string
    message: string
}

export const ErrorMessage = ({ title = 'Error', message }: ErrorMessageProps) => {
    return (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive border border-destructive/20 flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm opacity-90">{message}</p>
            </div>
        </div>
    )
}
