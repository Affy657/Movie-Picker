moved {
  from = module.ci.google_iam_workload_identity_pool.github
  to   = module.github.google_iam_workload_identity_pool.this
}

moved {
  from = module.ci.google_iam_workload_identity_pool_provider.github_actions
  to   = module.github.google_iam_workload_identity_pool_provider.this
}

moved {
  from = module.ci.google_storage_bucket_iam_member.object_admin["movie-picker-backups"]
  to   = module.ci.google_storage_bucket_iam_member.bucket["backups"]
}
