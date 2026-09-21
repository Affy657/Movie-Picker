variable "project_id" {
  description = "GCP project that hosts the production API, its container images and its secrets."
  type        = string
}

variable "region" {
  description = "Region of the Cloud Run service and of the Artifact Registry repository."
  type        = string
  default     = "europe-west1"
}

variable "api_runtime_service_account_name" {
  description = "Account id of the identity the API revisions run under, the same value as API_RUNTIME_SERVICE_ACCOUNT_NAME in deploy.yml."
  type        = string
  default     = "movie-picker-api"
}

variable "scheduler_service_account_name" {
  description = "Account id of the identity Cloud Scheduler signs its OIDC tokens with, the same value as SCHEDULER_SERVICE_ACCOUNT_NAME in deploy.yml."
  type        = string
  default     = "movie-picker-scheduler"
}

variable "backup_bucket" {
  description = "Bucket the MongoDB backups are written to, the same value as the BACKUP_BUCKET repository variable of GitHub; described and imported, never recreated."
  type        = string
  default     = "movie-picker-backups"
}

variable "state_bucket" {
  description = "Bucket that holds this state, the same value as TF_STATE_BUCKET: the identities that plan and apply from GitHub read or write it. The bucket itself is not described."
  type        = string
}

variable "alert_email" {
  description = "Address the alert policies notify, TF_VAR_alert_email: ALERT_EMAIL locally (.env), the ALERT_EMAIL secret in GitHub. An empty value is refused rather than applied: a plan run without the variable once offered to blank the notification channel of every alert."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$", var.alert_email))
    error_message = "alert_email must be an e-mail address: set ALERT_EMAIL (environment or .env) before planning the production root."
  }
}

variable "alert_sms_number" {
  description = "Phone number the alert policies also notify by SMS, in E.164 form, TF_VAR_alert_sms_number: ALERT_SMS_NUMBER locally (.env), the ALERT_SMS_NUMBER secret in GitHub. Empty, the default, means no SMS channel."
  type        = string
  sensitive   = true
  default     = ""

  validation {
    condition     = var.alert_sms_number == "" || can(regex("^\\+[1-9][0-9]{6,14}$", var.alert_sms_number))
    error_message = "alert_sms_number must be empty or an E.164 number (+ and 7 to 15 digits)."
  }
}
