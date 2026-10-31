import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1761600000000 implements MigrationInterface {
  name = 'InitialSchema1761600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE users (
      id varchar(36) NOT NULL PRIMARY KEY,
      email varchar(255) NOT NULL,
      password_hash varchar(255) NOT NULL,
      role varchar(20) NOT NULL,
      is_active tinyint NOT NULL DEFAULT 1,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE employees (
      id varchar(36) NOT NULL PRIMARY KEY,
      user_id varchar(36) NOT NULL,
      employee_number varchar(50) NOT NULL,
      full_name varchar(150) NOT NULL,
      department varchar(100) NOT NULL,
      position varchar(100) NULL,
      phone varchar(30) NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_employees_user (user_id),
      UNIQUE KEY uq_employees_number (employee_number),
      CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE attendances (
      id varchar(36) NOT NULL PRIMARY KEY,
      employee_id varchar(36) NOT NULL,
      work_date date NOT NULL,
      check_in_at datetime(3) NOT NULL,
      check_in_photo_key varchar(500) NOT NULL,
      check_in_note varchar(500) NULL,
      check_out_at datetime(3) NULL,
      check_out_photo_key varchar(500) NULL,
      check_out_note varchar(500) NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_attendance_employee_date (employee_id, work_date),
      KEY idx_attendance_date_employee (work_date, employee_id),
      CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE audit_logs (
      id varchar(36) NOT NULL PRIMARY KEY,
      actor_user_id varchar(36) NULL,
      action varchar(60) NOT NULL,
      entity_type varchar(40) NOT NULL,
      entity_id varchar(36) NOT NULL,
      metadata_json json NULL,
      request_id varchar(80) NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_audit_entity (entity_type, entity_id),
      CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE audit_logs');
    await queryRunner.query('DROP TABLE attendances');
    await queryRunner.query('DROP TABLE employees');
    await queryRunner.query('DROP TABLE users');
  }
}
