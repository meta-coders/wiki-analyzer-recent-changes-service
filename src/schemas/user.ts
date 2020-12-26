import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export default class User {
  @Expose()
  @IsString()
  @IsNotEmpty()
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }
}
