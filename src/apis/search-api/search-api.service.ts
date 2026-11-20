import { Injectable } from '@nestjs/common';
import { SearchUserDto } from '../../repositories/dto/search.user.dto';
import { UserRepoService } from '../../repositories/user-repo/user-repo.service';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';

@Injectable()
export class SearchApiService {
  constructor(private userRepoService: UserRepoService) {}
  async lookupUsers(body: SearchUserDto): Promise<UserEntity[]> {
    try {
      const found = await this.userRepoService.filterByUsername(
        body.login,
        body.limit,
        ['user.id id', 'displayName', 'email', 'ava_src', 'username'],
        body.user_id,
      );
      return Promise.resolve(found);
    } catch (e) {
      console.log('Error searching for users');
    }
    return Promise.resolve(null);
  }
}
