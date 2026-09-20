variable "project_id" {
  description = "Project that owns the checks, the policies, the channel and the dashboard."
  type        = string
}

variable "alert_email" {
  description = "Address every alert policy notifies. The value is a person, kept out of the repository: TF_VAR_alert_email, from ALERT_EMAIL locally and from the ALERT_EMAIL secret in GitHub."
  type        = string
  sensitive   = true
}

variable "alert_sms_number" {
  description = "Phone number every alert policy also notifies by SMS, in E.164 form; empty means no SMS channel. An e-mail waits to be read, a text message does not. Kept out of the repository like the address: TF_VAR_alert_sms_number."
  type        = string
  sensitive   = true
  default     = ""
}

variable "api_host" {
  description = "Public host of the API, probed by the two API checks."
  type        = string
}

variable "web_host" {
  description = "Canonical host of the web app, probed by the front check. An alias that redirects would fail the check."
  type        = string
}

variable "api_service_name" {
  description = "Cloud Run service name, the resource label the metric conditions and the log condition filter on."
  type        = string
}

variable "regions" {
  description = "Checker regions of every uptime check."
  type        = list(string)
  default     = ["EUROPE", "USA", "ASIA_PACIFIC"]
}
