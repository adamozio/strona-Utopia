terraform {
    required_providers {
      aws = {
        source  = "hashicorp/aws"
        version = "~> 5.0"
      }
    }
  }

  provider "aws" {
    region = var.aws_region
  }

  data "aws_instance" "website" {
    instance_id = var.instance_id
  }

  resource "aws_security_group_rule" "http" {
    type              = "ingress"
    from_port         = 80
    to_port           = 80
    protocol          = "tcp"
    cidr_blocks       = ["0.0.0.0/0"]
    security_group_id = data.aws_instance.website.vpc_security_group_ids[0]
  }

  resource "aws_security_group_rule" "https" {
    type              = "ingress"
    from_port         = 443
    to_port           = 443
    protocol          = "tcp"
    cidr_blocks       = ["0.0.0.0/0"]
    security_group_id = data.aws_instance.website.vpc_security_group_ids[0]
  }

  resource "aws_security_group_rule" "ssh" {
    type              = "ingress"
    from_port         = 22
    to_port           = 22
    protocol          = "tcp"
    cidr_blocks       = ["0.0.0.0/0"]
    security_group_id = data.aws_instance.website.vpc_security_group_ids[0]
  }