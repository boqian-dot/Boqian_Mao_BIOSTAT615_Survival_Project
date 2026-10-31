#!/usr/bin/env Rscript
# Genuine R references; outputs are generated, never edited by hand.
# Run from project root: Rscript reference/generate_fixtures.R
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(jsonlite))

make_data <- function(time, event, group = rep(c("A", "B"), length.out = length(time))) {
  data.frame(id = as.character(seq_along(time)), time = time,
             event = event, group = group, stringsAsFactors = FALSE)
}

cases <- list(
  teaching = make_data(c(1,2,3,3,3,5,6,7), c(1,0,1,1,0,1,0,1), c("A","B","A","B","A","B","A","B")),
  six_ties = make_data(c(1,2,2,3,4,4), c(1,1,0,1,0,1), c("A","A","B","B","A","B")),
  all_censored = make_data(c(1,2,3,4), c(0,0,0,0)),
  all_events = make_data(c(1,1,2,3,4), rep(1,5)),
  one_event = make_data(0, 1, "A"),
  one_censored = make_data(2, 0, "A"),
  time_zero = make_data(c(0,0,1,2), c(1,0,1,0)),
  positive_tail = make_data(c(1,2,3,4), c(1,0,1,0)),
  one_group_no_events = make_data(c(1,2,3,4), c(1,0,1,0), c("A","B","A","B")),
  all_same_time = make_data(rep(2,4), rep(1,4)),
  event_censor_same_time = make_data(c(1,1,1,2), c(1,0,0,1)),
  near_distinct = make_data(c(1,1+1e-12,2,3), c(1,1,0,1))
)
set.seed(6152026)
for (i in seq_len(50)) {
  n <- sample(4:100, 1)
  cases[[sprintf("seeded_%02d", i)]] <- make_data(
    sample(0:40, n, replace = TRUE), rbinom(n, 1, .65))
}

km_reference <- function(dat) {
  fit <- survfit(Surv(time,event) ~ 1, data = dat, stype = 1, ctype = 1,
                 robust = FALSE, timefix = FALSE, conf.type = "log-log", conf.int = .95)
  data.frame(time = fit$time, risk = fit$n.risk, events = fit$n.event,
             censored = fit$n.censor, survival = fit$surv, na = fit$cumhaz,
             lower = fit$lower, upper = fit$upper)
}
logrank_reference <- function(dat, name) {
  if (length(unique(dat$group)) != 2 || name == "near_distinct" || sum(dat$event) == 0) return(NULL)
  # In survival 3.8.6 an explicit timefix=FALSE is mistakenly forwarded into
  # model.frame and errors. Public survdiff on INTEGER times has identical ties.
  # near_distinct is deliberately excluded from this public-oracle check.
  result <- tryCatch(survdiff(Surv(time,event) ~ group, data = dat, rho = 0),
                     error = function(e) NULL)
  if (is.null(result)) return(NULL)
  variance <- result$var[1,1]
  if (!is.finite(variance) || variance <= 0) return(NULL)
  list(groups = sort(unique(dat$group)), counts = unname(as.numeric(result$n)),
       observed = unname(as.numeric(result$obs)), expected = unname(as.numeric(result$exp)),
       variance = variance, statistic = result$chisq,
       pValue = pchisq(result$chisq, df = 1, lower.tail = FALSE),
       logPValue = pchisq(result$chisq, df = 1, lower.tail = FALSE, log.p = TRUE))
}
fixture_cases <- lapply(names(cases), function(name) {
  dat <- cases[[name]]
  groups <- split(dat, dat$group)
  list(name = name, subjects = dat, rows = km_reference(dat),
       groupRows = lapply(groups, km_reference), logrank = logrank_reference(dat, name))
})
qs <- c(0,1,3.841458820694124,10,50,100,500,1000,1400)
tails <- data.frame(statistic = qs, pValue = pchisq(qs, 1, lower.tail = FALSE),
                    logPValue = pchisq(qs, 1, lower.tail = FALSE, log.p = TRUE))
transforms <- expand.grid(uniform = c(1e-10,1e-6,.1,.5,.9,1-1e-10),
                          shape = c(.6,1,2), scale = c(5,20,50))
transforms$eventTime <- qweibull(transforms$uniform, transforms$shape, transforms$scale)
dropout <- expand.grid(uniform = c(1e-10,.1,.5,.9,1-1e-10), rate = c(.005,.02,.2))
dropout$time <- qexp(dropout$uniform, rate = dropout$rate)
truth <- expand.grid(time = c(0,1,5,20,24,100), shape = c(.6,1,2), scale = c(5,20,50))
truth$survival <- pweibull(truth$time,truth$shape,truth$scale,lower.tail=FALSE)
truth$cumulativeHazard <- -pweibull(truth$time,truth$shape,truth$scale,lower.tail=FALSE,log.p=TRUE)
fixtures <- list(metadata = list(R = R.version.string, survival = as.character(packageVersion("survival")),
  jsonlite = as.character(packageVersion("jsonlite")), seed = 6152026,
  command = "Rscript reference/generate_fixtures.R", confidence = "95% pointwise log-log",
  ties = "exact recorded times; KM timefix=FALSE; public log-rank oracle only integer times",
  source = "R survival::survfit, survival::survdiff; stats::pchisq/qweibull/qexp/pweibull"),
  cases = fixture_cases, tails = tails, transforms = transforms, dropout = dropout, truth = truth)
dir.create("tests/fixtures", recursive = TRUE, showWarnings = FALSE)
write_json(fixtures, "tests/fixtures/r-reference.json", pretty = TRUE, auto_unbox = TRUE,
           digits = NA, na = "null", null = "null", dataframe = "rows")
cat(sprintf("Generated %d dataset references, %d tail references, %d Weibull inversions.\n",
            length(fixture_cases), length(qs), nrow(transforms)))
