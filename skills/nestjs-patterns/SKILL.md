---
name: nestjs-patterns
description: Use when building or reviewing NestJS modules, dependency injection, controllers, DTO validation, guards, resource authorization, or transactional services.
---

# NestJS Patterns

## When to Use

Use for NestJS HTTP or worker modules, providers, controllers, pipes, guards, configuration, and `TestingModule` tests. Check the installed Nest, `class-validator`, and `class-transformer` versions before relying on option details.

## How It Works

- Organize by feature module. Controllers translate transport input and delegate; providers own business invariants; export only providers another module actually consumes. Keep cross-cutting guards, pipes, filters, and interceptors intentional.
- Inject dependencies through providers. Keep configuration behind a typed factory/service and fail at startup for missing required environment values. Do not put secrets in response DTOs or logs.
- Validate unknown input at the boundary. Use DTO classes with runtime decorators, `whitelist`/`forbidNonWhitelisted` when the contract requires rejection, and explicit pipes such as `ParseIntPipe` or `ParseUUIDPipe` for route values. For numeric body fields, choose deliberately between rejecting strings and explicit `@Type(() => Number)`/transform; then validate integer, range, and format. Do not make implicit string-to-number conversion a blanket policy.
- A guard can authenticate a request and establish `req.user`; that is not resource authorization. Services must derive tenant scope from trusted context and check user/tenant ownership together with the resource lookup/update.
- Keep multi-write invariants in one service-level transaction. Pass the transaction-scoped client/manager to every persistence operation; do not mix a global repository with transactional work. Publish external effects after commit or through an outbox.
- Choose the API error shape with the project contract; Nest does not require a universal envelope. Return response DTOs/serializers rather than ORM entities.
- Unit-test providers with mocked dependencies and add request-level tests for validation, guards, filters, and authorization. Match production global pipes and filters in integration tests.

## Examples

```ts
export class UpdateMemberDto {
  @IsInt()
  @Min(1)
  quota!: number
}

@Patch(':id')
@UseGuards(JwtAuthGuard)
update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMemberDto,
       @Req() req: AuthenticatedRequest) {
  return this.members.updateForTenant(req.user.tenantId, req.user.id, id, dto)
}
```

The service must scope its query by `tenantId` and perform the authorization check as part of the write’s invariant; a JWT guard alone is insufficient. Confirm decorator imports and validation behavior against the project’s versions.

## References

- https://docs.nestjs.com/application/validation
- https://docs.nestjs.com/guards
- https://docs.nestjs.com/fundamentals/custom-providers
