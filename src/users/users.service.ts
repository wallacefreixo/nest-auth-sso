import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Users } from './users.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private repo: Repository<Users>,
  ) {}

  async findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async findByProviderUserId(providerUserId: string) {
    return this.repo.findOne({ where: { providerUserId } });
  }

  async createOrUpdateFromSSO(input: { providerUserId: string; email: string }) {
    let user = await this.findByProviderUserId(input.providerUserId);

    if (!user) {
      user = this.repo.create({
        provider: 'keycloak',
        providerUserId: input.providerUserId,
        email: input.email,
      });

      return this.repo.save(user);
    }

    user.email = input.email;

    return this.repo.save(user);
  }
}
