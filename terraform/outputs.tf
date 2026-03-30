output "public_ip" {
    value = data.aws_instance.website.public_ip
  }