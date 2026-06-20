---
title: "IdentityServer3 \u2192 Keycloak \u00b7 Strangler Fig migration across 16 environments"
context: "FDA-regulated continuous glucose monitoring ecosystem serving millions of users. 20+ first-party applications depended on IdentityServer3 for auth. Zero-downtime was non-negotiable \u2014 healthcare-critical infrastructure where auth outages directly impact patient safety."
approach: "Applied the Strangler Fig pattern to incrementally replace IdentityServer3 with Keycloak (OIDC/OAuth 2.0). Spring Cloud Gateway (WebFlux, reactive) served as the routing layer that gradually shifted traffic from the legacy IdP to Keycloak, ensuring backward compatibility throughout the transition. Kotlin as the primary language."
built:
  - "Passkeys SPI \u2014 WebAuthn-based passwordless auth"
  - "WebAuthn SPI \u2014 device-bound credentials"
  - "OTP SPI \u2014 time-based one-time passwords"
  - "MFA orchestration SPI \u2014 complex multi-step flows"
  - "Custom claim mappers \u2014 legacy token compatibility"
  - "Custom authenticators \u2014 step-up auth flows"
  - "Event listeners \u2014 audit + Datadog integration"
operations: "10 microservices, 16 environments managed with Kubernetes/ArgoCD. Redis cache strategy for session and token stores. Zero-downtime deployments via rolling updates with health-gated rollouts. Datadog for production observability \u2014 traces, metrics, logs \u2014 maintaining SLA targets across healthcare-critical infrastructure."
outcome: "Millions of CGM users authenticating through the new Keycloak-based identity platform with zero downtime during migration. 7+ custom SPIs shipped. 20+ first-party applications migrated with full backward compatibility."
order: 0
---
